"use client";

import { useState } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { env } from "@/lib/env";
import { PageShell } from "@/features/profile/page-shell";
import { useMeetWallet } from "@/features/wallet/use-meet-wallet";
import {
  ISSUER_NOTE,
  claimConfirmed,
  claimErrorMessage,
  errorCode,
  failureMessage,
  formatDateTime,
  isMissing,
  isUnavailable,
  networkLabel,
  txUrl,
  type CollectionState,
  type Eligibility,
} from "./model";
import { BackLink, Card, Loading, LoadFailed } from "./parts";
import { useClaim, useCollection, useEvent } from "./queries";

type Tone = { title: string; body: string };

const blocked: Record<Exclude<Eligibility, "eligible" | "already_owned">, Tone> = {
  not_checked_in: { title: "Check-in required", body: "The organizer records check-in during the event. Claim becomes available after that." },
  not_open: { title: "Claim not open yet", body: "Claiming opens later." },
  closed: { title: "Claim closed", body: "The claim window has ended. Nothing was claimed." },
  sold_out: { title: "Sold out", body: "All collectibles have been issued." },
  issuer_unavailable: { title: "Claiming unavailable", body: "The organizer's issuer can't authorize claims right now. Try again later." },
};

function WalletGate() {
  const wallet = useMeetWallet();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const setup = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await wallet.linkWallet();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <h2 className="font-display text-2xl text-mootz-ink">Wallet required</h2>
      <p className="text-sm text-mootz-muted">
        A linked wallet receives the collectible. Mootz uses the wallet linked to your account; claiming is free and the wallet is public on {networkLabel(env.chainId)}.
      </p>
      {failed && (
        <p role="alert" className="text-sm font-semibold text-mootz-deep">
          Couldn&apos;t set up the wallet. Try again.
        </p>
      )}
      <Button className="mt-2" block disabled={busy || wallet.status === "loading"} onClick={() => void setup()}>
        {busy ? "Setting up…" : "Set up wallet"}
      </Button>
    </Card>
  );
}

/** The claim panel; `aria-live` announces progress. Ownership appears only after confirmed readback. */
function ClaimPanel({ id, col }: { id: string; col: CollectionState }) {
  const claim = useClaim(id);
  const wallet = useMeetWallet();
  const walletMissing = !env.demoFixtures && wallet.status === "none";

  const job = claim.job;
  const confirmed = claimConfirmed(job);
  const ownedNow = col.eligibility === "already_owned" || confirmed;
  const failedJob = job?.status === "failed";
  const pending = claim.start.isPending || (claim.claimId !== null && job?.status === "pending") || (claim.claimId !== null && claim.status.isPending);
  const tx = txUrl(job);
  const submitError = claim.start.isError ? claim.start.error : null;

  let title: string;
  let body: string;
  if (ownedNow) {
    title = `You own ${col.collection.displayName}`;
    body = `Confirmed ownership · ${networkLabel(col.collection.chainId)}`;
  } else if (pending) {
    title = "Claim pending";
    body = "Waiting for confirmation. Ownership is not confirmed.";
  } else if (failedJob) {
    title = "Claim not completed";
    body = failureMessage(job?.reason);
  } else if (col.eligibility === "eligible") {
    title = "Authorized to claim";
    body = "Authorized · Free claim";
  } else if (col.eligibility === "already_owned") {
    title = "Owned";
    body = "";
  } else {
    ({ title, body } = blocked[col.eligibility]);
    if (col.eligibility === "not_open") body = `Claiming opens ${formatDateTime(col.collection.claimStartsAt)}.`;
  }

  const canClaim = !ownedNow && !pending && (col.eligibility === "eligible" || failedJob);

  return (
    <>
      <div aria-live="polite" className="flex flex-col gap-1 px-1 py-2">
        <h2 className="flex items-center gap-2 font-display text-[26px] leading-tight text-mootz-deep">
          {pending && <LoaderCircle aria-hidden size={22} className="animate-spin" />}
          {ownedNow && <CircleCheck aria-hidden size={22} />}
          {title}
        </h2>
        {body && <p className="text-sm font-semibold text-mootz-muted">{body}</p>}
        {pending && claim.status.isError && (
          <p className="text-sm font-semibold text-mootz-muted">Couldn&apos;t refresh the status. Still checking; this is not a failure.</p>
        )}
      </div>

      {submitError !== null && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-mootz-lilac p-3 text-sm font-semibold text-mootz-deep">
          <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
          {claimErrorMessage(submitError)}
        </p>
      )}

      <p className="text-xs font-semibold text-mootz-muted">
        Your wallet&apos;s ownership of this collectible is public. Your photos keep their existing audience.
      </p>
      <p className="text-xs font-semibold text-mootz-muted">{ISSUER_NOTE}</p>

      <div className="flex flex-col gap-2">
        {walletMissing && !ownedNow ? (
          <WalletGate />
        ) : canClaim ? (
          <Button size="lg" block onClick={() => {
              if (failedJob) claim.reset();
              claim.start.mutate();
            }}>
            {failedJob ? "Try claiming again" : submitError ? "Retry claim" : "Claim event collectible"}
          </Button>
        ) : null}
        {pending && claim.claimId && (
          <Button size="lg" block disabled={claim.status.isFetching} onClick={() => void claim.status.refetch()}>
            Check claim status
          </Button>
        )}
        {!ownedNow && col.eligibility === "not_checked_in" && (
          <ButtonLink href={`/events/${id}/check-in`} size="lg" block>
            Check in
          </ButtonLink>
        )}
        {ownedNow && (
          <ButtonLink href={`/events/${id}/collection/wear`} size="lg" block>
            Wear frame
          </ButtonLink>
        )}
        {tx && (
          <a href={tx} target="_blank" rel="noopener noreferrer" className="raised inline-flex min-h-12 items-center justify-center rounded-2xl bg-mootz-surface px-5 text-[15px] font-extrabold text-mootz-deep">
            View transaction
          </a>
        )}
      </div>
    </>
  );
}

/** Eligibility and claim (08.06 to 08.08). */
export function CollectionView({ id }: { id: string }) {
  const event = useEvent(id);
  const collection = useCollection(id);
  const wallet = useMeetWallet();
  const walletMissing = !env.demoFixtures && wallet.status === "none";

  if (event.isPending) return <Loading label="Loading collectible" />;
  if (event.isError) return <LoadFailed error={event.error} onRetry={() => void event.refetch()} />;
  const title = event.data.title;
  const back = <BackLink href={`/events/${id}`}>Back to event</BackLink>;

  if (collection.isPending && !walletMissing) return <Loading label="Checking your eligibility" />;

  if (walletMissing || errorCode(collection.error) === "WALLET_REQUIRED") {
    return (
      <PageShell header={back}>
        <h1 className="font-display text-[36px] leading-none text-mootz-ink">{title} frame</h1>
        <WalletGate />
      </PageShell>
    );
  }

  if (collection.isError) {
    const missing = isMissing(collection.error);
    return (
      <PageShell header={back}>
        <h1 className="font-display text-[36px] leading-none text-mootz-ink">{title} frame</h1>
        <Card>
          <h2 className="font-display text-2xl text-mootz-ink">{missing ? "No collectible for this event" : "Couldn't check your collectible"}</h2>
          <p className="text-sm text-mootz-muted">
            {missing
              ? "The organizer hasn't set one up."
              : isUnavailable(collection.error)
                ? "We couldn't reach the network to check ownership and supply. This does not mean you don't own it. Try again shortly."
                : "Check your connection and try again."}
          </p>
          {!missing && (
            <Button className="mt-2" variant="secondary" block disabled={collection.isFetching} onClick={() => void collection.refetch()}>
              {collection.isFetching ? "Checking…" : "Try again"}
            </Button>
          )}
        </Card>
      </PageShell>
    );
  }

  if (!collection.data) return <Loading label="Checking your eligibility" />;
  return (
    <PageShell header={back}>
      <CollectionBody id={id} eventTitle={title} col={collection.data} />
    </PageShell>
  );
}

function CollectionBody({ id, eventTitle, col }: { id: string; eventTitle: string; col: CollectionState }) {
  const c = col.collection;
  return (
    <>
      <h1 className="font-display text-[36px] leading-none text-mootz-ink">{c.displayName}</h1>
      <div className="grid place-items-center rounded-[28px] bg-mootz-lilac py-6">
        <Avatar name={c.displayName} src={c.artworkUrl} frame="event" size={112} />
      </div>
      <div className="flex flex-col gap-0.5 text-sm font-semibold text-mootz-muted">
        <p>From {eventTitle}</p>
        <p>Issued by the event organizer{env.demoFixtures ? " · Demo fixture" : ""}</p>
      </div>
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-extrabold text-mootz-deep">
          Issued {col.totalSupply} of {col.cap}
          {env.demoFixtures ? " · Demo" : ""}
        </span>
        <span className="font-semibold text-mootz-muted">{networkLabel(c.chainId)}</span>
      </p>
      <p className="text-xs font-semibold text-mootz-muted">One per wallet · Free to claim · Can&apos;t be transferred</p>
      <ClaimPanel id={id} col={col} />
    </>
  );
}
