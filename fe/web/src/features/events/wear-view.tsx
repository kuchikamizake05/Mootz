"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { PageShell } from "@/features/profile/page-shell";
import { useActiveFrame } from "@/features/frames/queries";
import { avatarFrame } from "@/features/frames/model";
import { useViewerIdentity } from "@/features/profile/viewer";
import { env } from "@/lib/env";
import { errorCode, isMissing, isUnavailable, owned } from "./model";
import { BackLink, Card, Loading, LoadFailed } from "./parts";
import { useCollection, useEvent, useWear } from "./queries";

function wearError(error: unknown) {
  const code = errorCode(error);
  if (code === "COLLECTION_NOT_OWNED" || code === "VERIFIED_WALLET_REQUIRED") return "Ownership couldn't be confirmed for this wallet, so the frame wasn't changed.";
  if (error instanceof ApiError && isUnavailable(error)) return "Ownership couldn't be rechecked right now. Your previous frame is unchanged.";
  return "Couldn't save your frame. Your previous frame is unchanged.";
}

/** Frame preview and provenance, then wear or remove (08.09, 08.10). Offered only when owned. */
export function WearView({ id }: { id: string }) {
  const event = useEvent(id);
  const collection = useCollection(id);
  const active = useActiveFrame();
  const wear = useWear();
  const viewer = useViewerIdentity();

  if (event.isPending || collection.isPending) return <Loading label="Loading frame" />;
  if (event.isError) return <LoadFailed error={event.error} onRetry={() => void event.refetch()} />;
  const back = <BackLink href={`/events/${id}/collection`}>Back to collectible</BackLink>;

  if (collection.isError) {
    return (
      <PageShell header={back}>
        <Card>
          <h1 className="font-display text-2xl text-mootz-ink">{isMissing(collection.error) ? "No collectible for this event" : "Couldn't check ownership"}</h1>
          {!isMissing(collection.error) && (
            <>
              <p className="text-sm text-mootz-muted">This does not mean you don&apos;t own it. Try again shortly.</p>
              <Button className="mt-2" variant="secondary" block onClick={() => void collection.refetch()}>
                Try again
              </Button>
            </>
          )}
        </Card>
      </PageShell>
    );
  }

  const col = collection.data;
  const c = col.collection;
  if (!owned(col)) {
    return (
      <PageShell header={back}>
        <Card>
          <h1 className="font-display text-2xl text-mootz-ink">Frame not owned yet</h1>
          <p className="text-sm text-mootz-muted">You can wear this frame after the claim is confirmed. Seeing a shared photo or an event tag does not grant it.</p>
          <ButtonLink href={`/events/${id}/collection`} block className="mt-2">
            Go to collectible
          </ButtonLink>
        </Card>
      </PageShell>
    );
  }

  const frame = active.data;
  const wearing = frame?.kind === "collection" && frame.collectionRef === c.id;
  const saved = wear.isSuccess && wear.data !== undefined;
  const busy = wear.isPending;

  return (
    <PageShell header={back}>
      <h1 className="font-display text-[36px] leading-none text-mootz-ink">{wearing ? "Frame equipped" : "Make it your look."}</h1>
      <p className="-mt-2 text-sm font-semibold text-mootz-muted">
        Owned · {c.displayName} · Issued {col.totalSupply} of {col.cap}
        {env.demoFixtures ? " · Demo" : ""}
      </p>

      <div className="flex justify-center gap-10 py-4">
        <figure className="flex flex-col items-center gap-2">
          <Avatar name="Current frame" src={viewer.avatarSrc} size={88} frame={avatarFrame(frame)} />
          <figcaption className="text-sm font-bold text-mootz-muted">{wearing ? "Wearing" : "Current"}</figcaption>
        </figure>
        {!wearing && (
          <figure className="flex flex-col items-center gap-2">
            <Avatar name="Preview with event frame" src={viewer.avatarSrc} size={88} frame="event" />
            <figcaption className="text-sm font-bold text-mootz-muted">Preview</figcaption>
          </figure>
        )}
      </div>

      <h2 className="font-display text-[28px] leading-tight text-mootz-ink">
        {c.displayName}
        {wearing ? " · Wearing" : ""}
      </h2>
      <p className="text-sm font-semibold text-mootz-muted">
        From {event.data.title}. Issued by the event organizer; not independent proof of attendance or uniqueness. Shared-photo approval does not grant this item.
      </p>

      <div aria-live="polite" className="flex flex-col gap-2">
        {wear.isError && (
          <p role="alert" className="rounded-2xl bg-mootz-lilac p-3 text-sm font-semibold text-mootz-deep">
            {wearError(wear.error)}
          </p>
        )}
        {active.isError && !wear.isError && <p className="text-sm font-semibold text-mootz-muted">Couldn&apos;t check your current frame right now.</p>}
        {saved && wearing && <p className="text-sm font-semibold text-mootz-muted">Equipped selection saved. The same frame appears on your Map marker and Feed avatar. Ownership is unchanged.</p>}
      </div>

      {wearing ? (
        <div className="flex flex-col gap-2">
          <ButtonLink href="/map" size="lg" block>
            View on map
          </ButtonLink>
          <ButtonLink href="/feed" variant="secondary" size="lg" block>
            View in feed
          </ButtonLink>
          <Button variant="soft" size="lg" block disabled={busy} onClick={() => wear.mutate(null)}>
            {busy ? "Removing…" : "Remove frame"}
          </Button>
        </div>
      ) : (
        <Button size="lg" block disabled={busy} onClick={() => wear.mutate(c.id)}>
          {busy ? "Saving…" : wear.isError ? "Try again" : "Wear frame"}
        </Button>
      )}
      <ButtonLink href={`/events/${id}/collection`} variant="soft" block>
        About this collectible
      </ButtonLink>
      <p className="text-xs font-semibold text-mootz-muted">The frame shows as worn only after saving succeeds. If saving fails, you keep ownership and your old frame.</p>
    </PageShell>
  );
}
