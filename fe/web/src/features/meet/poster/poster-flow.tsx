"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { ApiError, jsonBody } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { OFFCHAIN_MEET, RECORD_MEET } from "@/lib/chain/generated/protocol";
import { env } from "@/lib/env";
import type { MeetResult, OfferSession } from "../api";
import { demoQrText } from "../demo";
import { getLocationSample } from "../location";
import { encodeQr, offerTypedData, secondsLeft, type SerializedOffer } from "../protocol";
import { MeetResultView } from "../result/meet-result";
import { describeFailure, retryableCodes } from "../ui/errors";
import { isLocationFailure } from "../ui/location-recovery";
import { MeetFrame } from "../ui/meet-frame";
import { MeetGate, type ReadyWallet } from "../ui/meet-gate";
import { closeFlow, uuidToBytes32 } from "../ui/nav";
import { useMounted, useNowSeconds } from "../ui/use-now";
import { useAlive, useStartOnce } from "../ui/use-start-once";
import { QrScreen } from "./qr-screen";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCATION_REFRESH_MS = 10_000;
const POLL_MS = 2_000;
// Keep polling briefly past expiry: a scan accepted just before expiry may still land.
const POLL_GRACE_S = 6;

export function PosterFlow() {
  const momentId = useSearchParams().get("moment");
  if (!momentId || !UUID.test(momentId)) return <NoMoment />;
  if (env.demoFixtures) return <DemoPoster momentId={momentId} />;
  return (
    <MeetGate title="Meet" tone="deep">
      {(wallet) => <PosterSession momentId={momentId} wallet={wallet} />}
    </MeetGate>
  );
}

function NoMoment() {
  const router = useRouter();
  return (
    <MeetFrame title="Meet" onClose={() => closeFlow(router)}>
      <StateMessage icon={TriangleAlert} title="Pick a moment first" actions={<Button onClick={() => router.push("/map")}>Back to Map</Button>}>
        Meet starts from one of your camera moments posted today.
      </StateMessage>
    </MeetFrame>
  );
}

type Phase =
  | { name: "creating" }
  | { name: "signing" }
  | { name: "active"; id: string; offer: SerializedOffer; text: string }
  | { name: "error"; title: string; body: string; retry: boolean }
  | { name: "result"; meet: MeetResult };

function PosterSession({ momentId, wallet }: { momentId: string; wallet: ReadyWallet }) {
  const router = useRouter();
  const api = useApi();
  const [phase, setPhase] = useState<Phase>({ name: "creating" });
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const attemptRef = useRef(0);
  const now = useNowSeconds();

  const alive = useAlive();

  // Each call opens a brand-new Offer; an expired or failed one is never reused.
  async function start(restart: boolean) {
    const mine = ++attemptRef.current;
    const current = () => alive.current && mine === attemptRef.current;
    if (restart) {
      setPhase({ name: "creating" });
      setLocationNote(null);
    }
    let step: "create" | "sign" | "send" = "create";
    try {
      const session = await api<OfferSession>("/v1/meet/offers", jsonBody({ momentId }));
      if (!current()) return;

      // Refuse to sign anything that isn't exactly this user's own, current offer.
      const { offer, domain } = session;
      const expectedAction = wallet.profile.recordMeet ? RECORD_MEET : OFFCHAIN_MEET;
      const registryOk = !env.meetRegistryAddress || domain.verifyingContract.toLowerCase() === env.meetRegistryAddress.toLowerCase();
      const consistent =
        offer.poster.toLowerCase() === wallet.address.toLowerCase() &&
        offer.action.toLowerCase() === expectedAction &&
        offer.momentId.toLowerCase() === uuidToBytes32(momentId) &&
        offer.meetId.toLowerCase() === uuidToBytes32(session.id) &&
        domain.chainId === env.chainId &&
        registryOk &&
        secondsLeft(offer) > 0;
      if (!consistent) {
        setPhase({ name: "error", title: "Couldn't start this Meet.", body: "The offer didn't match your account or settings, so nothing was signed.", retry: true });
        return;
      }

      step = "sign";
      setPhase({ name: "signing" });
      const signature = await wallet.signTypedData(offerTypedData(domain, offer));
      if (!current()) return;

      step = "send";
      await api<OfferSession>(`/v1/meet/offers/${session.id}/signature`, jsonBody({ signature }, "PUT"));
      if (!current()) return;
      const text = encodeQr({ v: 1, id: session.id, offer, domain, sig: signature }, window.location.origin);
      setPhase({ name: "active", id: session.id, offer, text });
    } catch (error) {
      if (!current()) return;
      if (step === "sign" && !(error instanceof ApiError)) {
        setPhase({ name: "error", title: "Signing was cancelled.", body: "Nothing was saved.", retry: true });
        return;
      }
      const failure = describeFailure(error);
      setPhase({ name: "error", title: failure.title, body: failure.body, retry: retryableCodes.has(failure.code) || failure.code === "MEET_EXPIRED" });
    }
  }

  useStartOnce(() => void start(false));

  const active = phase.name === "active" ? phase : null;
  const left = active ? secondsLeft(active.offer, now * 1000) : 0;
  const activeId = active?.id ?? null;
  const live = !!active && left > 0;
  const polling = !!active && now <= Number(active.offer.expiresAt) + POLL_GRACE_S;

  // The backend needs a sample no older than 15 s at acceptance, so refresh while the QR is live.
  // Coordinates are sent and dropped; they are never stored or shown here.
  useEffect(() => {
    if (!activeId || !live) return;
    let stop = false;
    let busy = false;
    const send = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const sample = await getLocationSample();
        if (stop) return;
        await api(`/v1/meet/offers/${activeId}/location`, jsonBody(sample, "PUT"));
        if (!stop) setLocationNote(null);
      } catch (error) {
        if (stop) return;
        if (isLocationFailure(error)) {
          setLocationNote(
            error === "denied"
              ? "Location is off, so your friend can't complete this Meet. Allow location for Mootz, then open a new QR."
              : "Couldn't get your location yet. Keep this screen open and in view.",
          );
        } else if (error instanceof ApiError && (error.code === "LOCATION_ACCURACY" || error.code === "INVALID_LOCATION")) {
          setLocationNote("Location isn't precise enough yet. Move to open sky.");
        }
      } finally {
        busy = false;
      }
    };
    void send();
    const timer = setInterval(send, LOCATION_REFRESH_MS);
    document.addEventListener("visibilitychange", send);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", send);
    };
  }, [activeId, live, api]);

  // 404 means nobody has finished a Meet yet; the first 200 is the result.
  useEffect(() => {
    if (!activeId || !polling) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const meet = await api<MeetResult>(`/v1/meets/${activeId}`);
        if (!stop) setPhase({ name: "result", meet });
        return;
      } catch {
        // Not accepted yet (404) or a transient error: ask again.
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [activeId, polling, api]);

  if (phase.name === "result") return <MeetResultView meetId={phase.meet.meetId} initial={phase.meet} />;

  const close = () => closeFlow(router);
  return (
    <MeetFrame title="Meet" tone="deep" onClose={close}>
      {phase.name === "active" ? (
        <QrScreen momentId={momentId} text={phase.text} left={left} locationNote={locationNote} onNewQr={() => void start(true)} onClose={close} />
      ) : phase.name === "error" ? (
        <StateMessage
          icon={TriangleAlert}
          title={phase.title}
          className="[&_h2]:text-white [&_svg]:text-white [&>div:not(:last-child)]:text-white/80"
          actions={
            <>
              {phase.retry && (
                <Button variant="secondary" onClick={() => void start(true)}>
                  Try again
                </Button>
              )}
              <Button variant="soft" onClick={close}>
                Back to moment
              </Button>
            </>
          }
        >
          {phase.body}
        </StateMessage>
      ) : (
        <StateMessage icon={LoaderCircle} busy className="[&_h2]:text-white [&_svg]:text-white" title={phase.name === "signing" ? "Confirm in your wallet" : "Opening your QR…"}>
          <span className="text-white/80">
            {phase.name === "signing" ? "You're signing a Meet Offer for this one moment. Signing doesn't save anything onchain." : "Preparing your Meet."}
          </span>
        </StateMessage>
      )}
    </MeetFrame>
  );
}

function DemoPoster({ momentId }: { momentId: string }) {
  const router = useRouter();
  const mounted = useMounted();
  const now = useNowSeconds();
  const [expiresAt, setExpiresAt] = useState(() => Math.floor(Date.now() / 1000) + 60);
  const [scanned, setScanned] = useState(false);
  const close = () => closeFlow(router);

  if (scanned) return <MeetResultView meetId="demo" demo />;
  if (!mounted) {
    return (
      <MeetFrame title="Meet" tone="deep" onClose={close}>
        {null}
      </MeetFrame>
    );
  }
  return (
    <MeetFrame title="Meet" tone="deep" onClose={close}>
      <QrScreen
        demo
        momentId={momentId}
        text={demoQrText}
        left={Math.max(0, expiresAt - now)}
        onNewQr={() => setExpiresAt(now + 60)}
        onClose={close}
        onSimulate={() => setScanned(true)}
      />
    </MeetFrame>
  );
}
