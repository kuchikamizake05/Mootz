"use client";

import { CalendarDays, CircleCheck, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { AppShell } from "@/features/shell/app-shell";
import { MapView } from "@/features/map/map-view";
import { useViewerIdentity } from "@/features/profile/viewer";
import { eventPhase, formatDateTime, formatWindow, isMissing, owned } from "./model";
import { BackLink, Loading, LoadFailed } from "./parts";
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
    <AppShell>
      <div className="absolute inset-0 lg:right-[416px]"><MapView /></div>
      <section aria-label="Event details" className="absolute inset-x-0 bottom-0 z-40 flex max-h-[calc(100dvh-190px)] flex-col gap-2 overflow-y-auto rounded-t-[32px] bg-white px-4 pb-5 pt-3 shadow-float lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[104px] lg:w-[384px] lg:max-h-none lg:rounded-[32px]">
      <header className="flex min-h-11 items-center gap-2"><BackLink href="/map"> </BackLink><p className="text-xs font-extrabold uppercase tracking-wide text-mootz-muted">Event</p></header>
      <h1 className="font-display text-[32px] font-extrabold leading-none text-mootz-ink">{e.title}</h1>
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

      <div className="flex flex-col gap-1 py-1">
        <p className="text-sm font-bold text-mootz-deep">Event information is readable independently</p>
        <p className="text-xs font-semibold text-mootz-muted">Photo audience unchanged. Claim approval separate.</p>
      </div>

      <div className="flex flex-col gap-2">
        <ButtonLink href="/feed?filter=events" variant="secondary" block>
          View moments
        </ButtonLink>
        <ButtonLink href={`/events/${id}/check-in`} variant="secondary" block>
          {checkIn.data?.checkedIn ? "Check-in details" : "Check in"}
        </ButtonLink>
      </div>

      {hasCollection && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 border-t border-mootz-hairline py-3">
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
      <p role="status" className="flex items-center gap-2 text-xs text-mootz-muted">{checkIn.data?.checkedIn && <CircleCheck aria-hidden size={16} />}{checkInLabel}</p>
      <p className="text-xs font-semibold text-mootz-muted">
        Viewing an event does not prove attendance or grant a claim. The collectible is issued by the organizer.
      </p>
      </section>
    </AppShell>
  );
}
