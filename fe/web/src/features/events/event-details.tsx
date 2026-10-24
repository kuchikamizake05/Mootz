"use client";

import { CalendarDays, CircleCheck, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/features/profile/page-shell";
import { useViewerIdentity } from "@/features/profile/viewer";
import { eventPhase, formatDateTime, formatWindow, isMissing, owned } from "./model";
import { BackLink, Card, Loading, LoadFailed } from "./parts";
import { useCheckIn, useCollection, useEvent, useNow } from "./queries";

/** Event details (08.04). Reading this never proves attendance or grants a claim. */
export function EventDetails({ id }: { id: string }) {
  const event = useEvent(id);
  const checkIn = useCheckIn(id);
  const collection = useCollection(id);
  const now = useNow();
  const viewer = useViewerIdentity();

  if (event.isPending) return <Loading label="Loading event" />;
  if (event.isError) return <LoadFailed error={event.error} onRetry={() => void event.refetch()} />;
  const e = event.data;
  const phase = eventPhase(e, now);
  const checkInLabel = checkIn.isError
    ? "Check-in status unavailable right now."
    : checkIn.isPending
      ? "Checking…"
      : checkIn.data.checkedIn
        ? `Checked in${checkIn.data.checkedInAt ? ` · ${formatDateTime(checkIn.data.checkedInAt)}` : ""}`
        : phase === "ended"
          ? "Not checked in. The event has ended."
          : phase === "upcoming"
            ? "Not checked in. The organizer records check-in during the event."
            : "Not checked in yet.";
  const hasCollection = !isMissing(collection.error);
  const col = collection.data;

  return (
    <PageShell header={<BackLink href="/map">Back</BackLink>}>
      <p className="text-xs font-extrabold uppercase tracking-wide text-mootz-muted">Event</p>
      <h1 className="-mt-3 font-display text-[40px] leading-none text-mootz-ink">{e.title}</h1>
      <div className="flex flex-col gap-1.5 text-sm font-semibold text-mootz-muted">
        <p className="flex items-start gap-2">
          <CalendarDays aria-hidden size={18} className="mt-0.5 shrink-0" />
          <span>
            {formatWindow(e.startsAt, e.endsAt)}
            {phase === "live" && <b className="ml-2 text-mootz-deep">Happening now</b>}
            {phase === "ended" && <b className="ml-2 text-mootz-deep">Ended</b>}
          </span>
        </p>
        {e.locationLabel && (
          <p className="flex items-start gap-2">
            <MapPin aria-hidden size={18} className="mt-0.5 shrink-0" />
            <span>{e.locationLabel} · Venue label only</span>
          </p>
        )}
      </div>
      {e.description && <p className="whitespace-pre-line text-[15px] text-mootz-ink">{e.description}</p>}

      <Card className="bg-mootz-lilac">
        <p className="font-bold text-mootz-deep">Event information is readable independently</p>
        <p className="text-xs font-semibold text-mootz-muted">Photo audience unchanged. Claim approval separate.</p>
      </Card>

      <Card>
        <h2 className="font-display text-2xl text-mootz-ink">Check-in</h2>
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-mootz-muted">
          {checkIn.data?.checkedIn && <CircleCheck aria-hidden size={18} className="text-mootz-deep" />}
          {checkInLabel}
        </p>
        <ButtonLink href={`/events/${id}/check-in`} variant="secondary" block className="mt-2">
          {checkIn.data?.checkedIn ? "Check-in details" : "Check in"}
        </ButtonLink>
      </Card>

      <div className="flex flex-col gap-2">
        <ButtonLink href="/feed?filter=events" block>
          View event moments
        </ButtonLink>
        <ButtonLink href="/map?filter=events" variant="secondary" block>
          View on map
        </ButtonLink>
      </div>

      {hasCollection && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-[28px] bg-mootz-lilac p-3">
            <Avatar name={col?.collection.displayName ?? "Event frame"} src={col?.collection.artworkUrl ?? viewer.avatarSrc} frame="event" size={56} />
            <div className="min-w-0">
              <p className="font-display text-xl leading-tight text-mootz-ink">{col?.collection.displayName ?? `${e.title} frame`}</p>
              <p className="text-xs font-semibold text-mootz-muted">
                {owned(col) ? "You own this · " : ""}Organizer-authorized · Free to claim
              </p>
            </div>
          </div>
          <ButtonLink href={`/events/${id}/collection`} block>
            View collectible
          </ButtonLink>
        </div>
      )}
      <p className="text-xs font-semibold text-mootz-muted">
        Viewing an event does not prove attendance or grant a claim. The collectible is issued by the organizer.
      </p>
    </PageShell>
  );
}
