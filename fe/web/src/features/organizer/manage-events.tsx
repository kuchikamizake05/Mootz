"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LoaderCircle, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { PageShell } from "@/features/profile/page-shell";
import { Card } from "@/features/events/parts";
import { formatDateTime, formatWindow } from "@/features/events/model";
import { ApiError } from "@/lib/api/client";
import { OrganizerAccess } from "./access";
import { useOrganizerEvents, useRecordAttendance, type OrganizerEvent } from "./event-queries";

function AttendanceForm({ event }: { event: OrganizerEvent }) {
  const attendance = useRecordAttendance(event.id);
  const [accountId, setAccountId] = useState("");
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId.trim());
  const submit = (form: FormEvent) => { form.preventDefault(); if (valid && !attendance.isPending) attendance.mutate(accountId.trim()); };
  const status = attendance.error instanceof ApiError ? attendance.error.status : null;
  return <form onSubmit={submit} className="mt-2 flex flex-col gap-3 border-t border-mootz-hairline pt-3">
    <p className="text-sm text-mootz-muted">Ask the attendee to open this event&apos;s check-in page and share their account code. Verify attendance before recording it.</p>
    <label className="flex flex-col gap-1 text-sm font-bold">Attendee account code
      <input value={accountId} onChange={e => { setAccountId(e.target.value); attendance.reset(); }} disabled={attendance.isPending} required autoComplete="off" spellCheck={false} maxLength={36} placeholder="Account UUID" className="min-h-12 w-full rounded-2xl border border-mootz-hairline bg-white px-3 py-2 text-sm" />
    </label>
    {attendance.isError && <p role="alert" className="text-sm font-bold text-mootz-deep">{status === 403 ? "You no longer have permission to manage this event." : status === 404 ? "The event or attendee account was not found." : status === 409 ? "New attendance can only be recorded during the event." : "Attendance wasn't confirmed. Retry the same account code safely."}</p>}
    {attendance.isSuccess && <p role="status" className="text-sm font-bold text-mootz-deep">Check-in recorded · {formatDateTime(attendance.data.checkedInAt)}. The attendee can refresh their check-in page. Claiming is a separate step.</p>}
    <Button type="submit" block disabled={!valid || attendance.isPending}>{attendance.isPending ? "Recording…" : "Record check-in"}</Button>
  </form>;
}

function EventManager() {
  const router = useRouter();
  const events = useOrganizerEvents();
  const [selected, setSelected] = useState<string | null>(null);
  const items = events.data?.pages.flatMap(page => page.items) ?? [];
  return <PageShell title="My events" showDemoBadge={false} onBack={() => router.push("/profile")}>
    <p className="text-sm text-mootz-muted">Create events and record attendance. The event team publishes and configures collectibles separately.</p>
    <ButtonLink href="/organizer/events/new" size="lg" block>Create event</ButtonLink>
    {events.isPending ? <StateMessage icon={LoaderCircle} busy title="Loading your events" /> : events.isError && !events.data ? <StateMessage icon={TriangleAlert} title="Couldn't load your events" actions={<Button onClick={() => void events.refetch()}>Try again</Button>}>Check your connection and organizer access.</StateMessage> : items.length === 0 ? <StateMessage icon={CalendarDays} title="Your first event starts here">Create an event to share its details with attendees.</StateMessage> : <ul className="flex flex-col gap-4" aria-label="Your events">
      {items.map(event => <li key={event.id}><Card>
        <h2 className="font-display text-2xl text-mootz-ink">{event.title}</h2>
        <p className="text-sm text-mootz-muted">{formatWindow(event.startsAt, event.endsAt)}</p>
        {event.locationLabel && <p className="text-sm text-mootz-muted">{event.locationLabel}</p>}
        <p className="text-sm font-bold text-mootz-deep">{event.checkInCount} checked in</p>
        <p className="text-sm text-mootz-muted">{event.collectionStatus === "configured" ? "Collectible configured. Claim availability is checked separately." : "Collectible not configured. Share the event ID with the event team to set it up."}</p>
        <details className="text-sm"><summary className="min-h-11 cursor-pointer content-center font-bold text-mootz-deep">Event ID for the event team</summary><code className="block break-all pb-3 text-xs">{event.id}</code></details>
        <ButtonLink href={`/events/${event.id}`} variant="secondary" block>Open event page</ButtonLink>
        {event.collectionStatus === "configured" && <ButtonLink href={`/events/${event.id}/collection`} variant="secondary" block>View collectible</ButtonLink>}
        <Button variant="soft" block aria-expanded={selected === event.id} onClick={() => setSelected(selected === event.id ? null : event.id)}>{selected === event.id ? "Close check-in" : "Manage check-ins"}</Button>
        {selected === event.id && <AttendanceForm key={event.id} event={event} />}
      </Card></li>)}
    </ul>}
    {events.isFetchNextPageError && <p role="alert" className="text-sm text-mootz-deep">Couldn&apos;t load more events. Your loaded events are still available.</p>}
    {events.hasNextPage && <Button variant="secondary" disabled={events.isFetchingNextPage} onClick={() => void events.fetchNextPage()}>{events.isFetchingNextPage ? "Loading…" : "Load more events"}</Button>}
    <ButtonLink href="/organizer" variant="secondary" block>Open independent onchain reader</ButtonLink>
  </PageShell>;
}

export function ManageEventsPage() { return <OrganizerAccess><EventManager /></OrganizerAccess>; }
