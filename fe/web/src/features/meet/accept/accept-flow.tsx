"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Ban, Clock, LoaderCircle, ScanLine, ShieldAlert, TriangleAlert } from "lucide-react";
import { recoverTypedDataAddress } from "viem";
import { Button, ButtonLink } from "@/components/ui/button";
import { PairedPhoto } from "@/components/ui/moment";
import { StateMessage } from "@/components/ui/status";
import { ApiError, jsonBody } from "@/lib/api/client";
import { useApi, useApiBytes } from "@/lib/api/use-api";
import { OFFCHAIN_MEET, RECORD_MEET } from "@/lib/chain/generated/protocol";
import { env } from "@/lib/env";
import type { LocationSample, MeetPreview, MeetResult } from "../api";
import { demoCaption, demoPhotos } from "../demo";
import { getLocationSample } from "../location";
import {
  acceptTypedData,
  commitmentMatches,
  decodeQr,
  offerDigest,
  offerTypedData,
  secondsLeft,
  sha256Hex,
  type QrPayload,
} from "../protocol";
import { MeetResultView } from "../result/meet-result";
import { describeFailure, retryableCodes } from "../ui/errors";
import { isLocationFailure, LocationRecovery } from "../ui/location-recovery";
import { DemoBadge, MeetFrame } from "../ui/meet-frame";
import { MeetGate, type ReadyWallet } from "../ui/meet-gate";
import { clearPayload, closeFlow, currentFragment, uuidToBytes32 } from "../ui/nav";
import { useMounted, useNowSeconds } from "../ui/use-now";
import { useAlive, useStartOnce } from "../ui/use-start-once";
import type { LocationFailure } from "../location";

const subscribeHash = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};

type Image = MeetPreview["moment"]["images"][number];

type Phase =
  | { name: "loading" }
  | { name: "ready"; preview: MeetPreview; front: string; back: string }
  | { name: "unverified"; reason: string }
  | { name: "signing" }
  | { name: "checking" }
  | { name: "declined" }
  | { name: "cancelled" }
  | { name: "location"; reason: LocationFailure }
  | { name: "error"; code: string; title: string; body: string; retry: boolean }
  | { name: "result"; meet: MeetResult };

export function AcceptFlow() {
  const mounted = useMounted();
  const fragment = useSyncExternalStore(subscribeHash, currentFragment, () => "");
  if (env.demoFixtures) return <DemoAccept />;
  if (!mounted) return <Shell>{<StateMessage icon={LoaderCircle} busy title="Loading…" />}</Shell>;

  const payload = fragment ? decodeQr(fragment) : null;
  if (!payload) {
    return (
      <Shell>
        <StateMessage
          icon={ScanLine}
          title={fragment ? "That's not a Mootz Meet QR." : "Scan a friend's QR"}
          actions={<ButtonLink href="/meet/scan">Open scanner</ButtonLink>}
        >
          {fragment ? "Nothing was sent. Ask your friend to open a new QR." : "Open the scanner in Mootz and point it at your friend's QR."}
        </StateMessage>
      </Shell>
    );
  }
  return (
    <MeetGate title="Meet preview">
      {(wallet) => <AcceptSession payload={payload} wallet={wallet} />}
    </MeetGate>
  );
}

function Shell({ children, title = "Meet" }: { children: ReactNode; title?: string }) {
  const router = useRouter();
  return (
    <MeetFrame
      title={title}
      onClose={() => {
        clearPayload();
        closeFlow(router);
      }}
    >
      {children}
    </MeetFrame>
  );
}

function AcceptSession({ payload, wallet }: { payload: QrPayload; wallet: ReadyWallet }) {
  const router = useRouter();
  const api = useApi();
  const apiBytes = useApiBytes();
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const now = useNowSeconds();
  const urls = useRef<string[]>([]);
  const signature = useRef<Awaited<ReturnType<ReadyWallet["signTypedData"]>> | null>(null);
  const preview = useRef<MeetPreview | null>(null);

  // Object URLs hold private photo bytes; release them when leaving.
  useEffect(() => {
    const created = urls.current;
    return () => created.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const digest = offerDigest(payload.domain, payload.offer);
  const expectedAction = wallet.profile.recordMeet ? RECORD_MEET : OFFCHAIN_MEET;
  const left = secondsLeft(payload.offer, now * 1000);
  const waiting = phase.name === "loading" || phase.name === "ready" || phase.name === "error" || phase.name === "location" || phase.name === "cancelled";
  const expired = waiting && now > 0 && left === 0;

  const alive = useAlive();

  async function load() {
    const current = () => alive.current;
    const unverified = (reason: string) => current() && setPhase({ name: "unverified", reason });
    try {
      const { offer, domain, id, sig } = payload;
      if (offer.poster.toLowerCase() === wallet.address.toLowerCase()) {
        return void (current() && setPhase({ name: "error", code: "SELF_MEET", title: "That's your own QR.", body: "Scan a friend's QR to Meet.", retry: false }));
      }
      // The QR is untrusted input: check it is internally consistent before any request.
      const registryOk = !env.meetRegistryAddress || domain.verifyingContract.toLowerCase() === env.meetRegistryAddress.toLowerCase();
      if (domain.chainId !== env.chainId || !registryOk) return void unverified("domain");
      if (offer.meetId.toLowerCase() !== uuidToBytes32(id)) return void unverified("id");
      const signer = await recoverTypedDataAddress({ ...offerTypedData(domain, offer), signature: sig });
      if (signer.toLowerCase() !== offer.poster.toLowerCase()) return void unverified("signature");

      const body = jsonBody({ offerDigest: digest, posterSignature: sig });
      const result = await api<MeetPreview>(`/v1/meet/offers/${id}/preview`, body);
      if (!current()) return;

      const sameDomain =
        result.domain.chainId === domain.chainId &&
        result.domain.verifyingContract.toLowerCase() === domain.verifyingContract.toLowerCase() &&
        result.domain.name === domain.name &&
        result.domain.version === domain.version;
      const accept = result.acceptance;
      if (
        !sameDomain ||
        accept.offerDigest.toLowerCase() !== digest.toLowerCase() ||
        accept.scanner.toLowerCase() !== wallet.address.toLowerCase() ||
        accept.action.toLowerCase() !== expectedAction ||
        uuidToBytes32(result.moment.id) !== offer.momentId.toLowerCase()
      ) {
        return void unverified("acceptance");
      }

      const front = result.moment.images.find((i) => i.side === "front");
      const back = result.moment.images.find((i) => i.side === "back");
      if (!front || !back || result.moment.images.length !== 2) return void unverified("images");

      // Preview bytes must be exactly what the poster committed to, or nothing is shown or signed.
      const fetchImage = async (image: Image) => {
        if (image.path !== `/v1/meet/offers/${id}/media/${image.side}`) throw new Error("PATH");
        const blob = await apiBytes(image.path, body);
        const bytes = await blob.arrayBuffer();
        return { blob, sha: await sha256Hex(bytes) };
      };
      const [f, b] = await Promise.all([fetchImage(front), fetchImage(back)]);
      if (!current()) return;
      const hashesOk = f.sha === front.sha256.toLowerCase() && b.sha === back.sha256.toLowerCase();
      if (!hashesOk || !commitmentMatches(offer, f.sha, b.sha, result.proof.salt)) return void unverified("commitment");

      const frontUrl = URL.createObjectURL(f.blob);
      const backUrl = URL.createObjectURL(b.blob);
      urls.current.push(frontUrl, backUrl);
      preview.current = result;
      setPhase({ name: "ready", preview: result, front: frontUrl, back: backUrl });
    } catch (error) {
      if (!current()) return;
      if (error instanceof ApiError) return void setPhase({ name: "error", retry: false, ...describeFailure(error) });
      unverified("exception");
    }
  }

  useStartOnce(() => void load());

  /** Signs once (kept for retries of the same attempt), then one foreground distance check. */
  async function approve() {
    const loaded = preview.current;
    if (!loaded) return;
    if (!signature.current) {
      setPhase({ name: "signing" });
      try {
        signature.current = await wallet.signTypedData(acceptTypedData(loaded.domain, loaded.acceptance));
      } catch {
        if (alive.current) setPhase({ name: "cancelled" });
        return;
      }
    }
    if (!alive.current) return;
    setPhase({ name: "checking" });
    let location: LocationSample;
    try {
      location = await getLocationSample();
    } catch (reason) {
      if (alive.current) setPhase(isLocationFailure(reason) ? { name: "location", reason } : { name: "location", reason: "unavailable" });
      return;
    }
    try {
      const meet = await api<MeetResult>(
        `/v1/meet/offers/${payload.id}/accept`,
        jsonBody({ offerDigest: digest, action: loaded.acceptance.action, signature: signature.current, location }),
      );
      if (alive.current) setPhase({ name: "result", meet });
    } catch (error) {
      if (alive.current) {
        const failure = describeFailure(error);
        setPhase({ name: "error", retry: retryableCodes.has(failure.code), ...failure });
      }
    }
  }

  const leave = () => {
    clearPayload();
    closeFlow(router);
  };

  if (phase.name === "result") return <MeetResultView meetId={phase.meet.meetId} initial={phase.meet} />;

  if (expired) {
    return (
      <Shell>
        <StateMessage icon={Clock} title="This QR expired." actions={<ButtonLink href="/meet/scan" onClick={clearPayload}>Scan again</ButtonLink>}>
          Ask your friend to open a new QR. Nothing was saved.
        </StateMessage>
      </Shell>
    );
  }

  if (phase.name === "loading" || phase.name === "signing" || phase.name === "checking") {
    const title = phase.name === "loading" ? "Checking this moment…" : phase.name === "signing" ? "Confirm in your wallet" : "Checking distance once";
    const body =
      phase.name === "loading"
        ? "Fetching and verifying the photos your friend signed."
        : phase.name === "signing"
          ? "You're confirming you're in this photo with your friend."
          : "One foreground location check. Nothing is tracked or stored.";
    return (
      <Shell>
        <StateMessage icon={LoaderCircle} busy title={title}>
          {body}
        </StateMessage>
      </Shell>
    );
  }

  if (phase.name === "unverified") {
    return (
      <Shell>
        <StateMessage icon={ShieldAlert} title="This preview couldn't be verified. Nothing was signed." actions={<Button variant="secondary" onClick={leave}>Back</Button>}>
          The QR or photos didn&apos;t match what your friend signed. Ask them to open a new QR.
        </StateMessage>
      </Shell>
    );
  }

  if (phase.name === "declined") {
    return (
      <Shell>
        <StateMessage icon={Ban} title="You declined." actions={<Button variant="secondary" onClick={leave}>Done</Button>}>
          Nothing was sent and no Dot was made.
        </StateMessage>
      </Shell>
    );
  }

  if (phase.name === "cancelled") {
    return (
      <Shell>
        <StateMessage
          icon={TriangleAlert}
          title="Signing was cancelled. Nothing was saved."
          actions={
            <>
              <Button onClick={() => void approve()}>Try again</Button>
              <Button variant="secondary" onClick={leave}>Back to moment</Button>
            </>
          }
        >
          This QR works until it expires.
        </StateMessage>
      </Shell>
    );
  }

  if (phase.name === "location") {
    return (
      <Shell>
        <LocationRecovery
          reason={phase.reason}
          actions={
            <>
              <Button onClick={() => void approve()}>Try again</Button>
              <Button variant="secondary" onClick={leave}>Back to moment</Button>
            </>
          }
        />
      </Shell>
    );
  }

  if (phase.name === "error") {
    const canRetry = phase.retry;
    const distance = phase.code === "MEET_DISTANCE";
    return (
      <Shell>
        <StateMessage
          icon={TriangleAlert}
          title={distance ? "You're too far apart to Meet. Move within 100 m and try again." : phase.title}
          actions={
            <>
              {canRetry && <Button onClick={() => void approve()}>Try again</Button>}
              <Button variant="secondary" onClick={leave}>{canRetry ? "Back to moment" : "Back"}</Button>
            </>
          }
        >
          {distance ? "No new Dot. Each attempt uses one foreground location check." : phase.body}
          <span role="status" className="mt-2 block">{left > 0 && canRetry ? `This QR is valid for ${left} more seconds.` : ""}</span>
        </StateMessage>
      </Shell>
    );
  }

  return (
    <Preview
      preview={phase.preview}
      front={phase.front}
      back={phase.back}
      left={left}
      onApprove={() => void approve()}
      onDecline={() => {
        signature.current = null;
        setPhase({ name: "declined" });
      }}
      onClose={leave}
    />
  );
}

function Preview({
  preview,
  front,
  back,
  left,
  demo,
  onApprove,
  onDecline,
  onClose,
}: {
  preview?: MeetPreview;
  front: string;
  back: string;
  left?: number;
  demo?: boolean;
  onApprove: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  const caption = preview?.moment.caption ?? demoCaption;
  return (
    <MeetFrame title="Meet preview" onClose={onClose}>
      {demo && <DemoBadge />}
      <p className="text-sm font-extrabold">Your friend</p>
      <PairedPhoto backSrc={back} frontSrc={front} authorName="your friend" className="h-[360px] w-full" />
      {caption && <p className="text-base">{caption}</p>}
      <h2 className="font-display text-[34px] leading-[1.05]">Confirm you&apos;re in this photo with your friend</h2>
      <p className="font-bold text-mootz-deep">Only this moment is shared with you.</p>
      <p className="text-sm text-mootz-muted">
        Approving adds your confirmation to this Meet.
        {left !== undefined && left > 0 && left <= 20 ? ` This QR expires in ${left} s.` : ""}
      </p>
      <div className="flex flex-col gap-2">
        <Button size="lg" block onClick={onApprove}>
          Approve
        </Button>
        <Button variant="secondary" size="lg" block onClick={onDecline}>
          Decline
        </Button>
        <ButtonLink variant="secondary" size="lg" block href="/meet/whats-recorded">
          What&apos;s recorded?
        </ButtonLink>
      </div>
      <p className="text-xs font-bold text-mootz-muted">
        No friendship is created. No daily post or streak credit for scanning. A signature and a distance check don&apos;t prove you were there or that the photo is real.
      </p>
    </MeetFrame>
  );
}

type DemoPhase = "preview" | "checking" | "result" | "declined";

function DemoAccept() {
  const router = useRouter();
  const mounted = useMounted();
  const [phase, setPhase] = useState<DemoPhase>("preview");
  // Demo only: reachable without a backend; nothing is sent or signed.
  useEffect(() => {
    if (phase !== "checking") return;
    const timer = setTimeout(() => setPhase("result"), 1500);
    return () => clearTimeout(timer);
  }, [phase]);
  const close = () => closeFlow(router);

  if (!mounted) return <MeetFrame title="Meet preview" onClose={close}>{null}</MeetFrame>;
  if (phase === "result") return <MeetResultView meetId="demo" demo />;
  if (phase === "checking") {
    return (
      <MeetFrame title="Meet" onClose={close}>
        <DemoBadge />
        <StateMessage icon={LoaderCircle} busy title="Checking distance once">
          Demo only. No location is requested.
        </StateMessage>
      </MeetFrame>
    );
  }
  if (phase === "declined") {
    return (
      <MeetFrame title="Meet" onClose={close}>
        <DemoBadge />
        <StateMessage icon={Ban} title="You declined." actions={<Button variant="secondary" onClick={close}>Done</Button>}>
          Nothing was sent and no Dot was made.
        </StateMessage>
      </MeetFrame>
    );
  }
  return <Preview demo front={demoPhotos.front} back={demoPhotos.back} onApprove={() => setPhase("checking")} onDecline={() => setPhase("declined")} onClose={close} />;
}
