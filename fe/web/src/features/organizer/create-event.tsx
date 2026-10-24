"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/features/profile/page-shell";
import { ApiError } from "@/lib/api/client";
import { OrganizerAccess } from "./access";
import { useCreateEvent, type CreateEvent } from "./event-queries";
import { eventInput } from "./event-input";

export const eventFieldClass = "min-h-12 w-full rounded-2xl border border-mootz-hairline bg-mootz-surface px-3 py-2 text-base text-mootz-ink disabled:bg-mootz-canvas";

function CreateEventForm() {
  const router = useRouter();
  const create = useCreateEvent();
  const [requestId] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState<CreateEvent | null>(null);
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let input = submitted;
    if (!input) {
      const form = new FormData(event.currentTarget);
      try {
        input = eventInput({ title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""), startsAt: String(form.get("startsAt") ?? ""), endsAt: String(form.get("endsAt") ?? ""), locationLabel: String(form.get("locationLabel") ?? "") }, requestId, Date.now());
      } catch (error) { setError(error instanceof Error ? error.message : "Check the event details."); return; }
    }
    setError(""); setSubmitted(input);
    create.mutate(input, {
      onSuccess: () => router.replace("/organizer/events"),
      onError: (error) => {
        const status = error instanceof ApiError ? error.status : 0;
        if (status >= 400 && status < 500 && status !== 409) setSubmitted(null);
        setError(status === 403 ? "Your organizer access is no longer available." : status === 400 ? "Check the title, venue and event times." : status === 409 ? "This request already exists with different details. Check your event list before creating another." : "We couldn't confirm whether the event was created. Retry to check the same request safely.");
      },
    });
  };
  return <PageShell title="Create event" showDemoBadge={false} onBack={() => router.push("/organizer/events")}>
    <p className="text-sm text-mootz-muted">Add the details attendees will see. Creating an event does not issue its collectible.</p>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset disabled={create.isPending || submitted !== null} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-bold">Event name<input className={eventFieldClass} name="title" required maxLength={200} autoComplete="off" /></label>
        <label className="flex flex-col gap-1 text-sm font-bold">Description<textarea className={eventFieldClass} name="description" maxLength={10000} rows={4} /></label>
        <label className="flex flex-col gap-1 text-sm font-bold">Venue<input className={eventFieldClass} name="locationLabel" maxLength={200} placeholder="Venue name (optional)" /></label>
        <label className="flex flex-col gap-1 text-sm font-bold">Starts<input className={eventFieldClass} name="startsAt" type="datetime-local" required aria-describedby="event-time-help" /></label>
        <label className="flex flex-col gap-1 text-sm font-bold">Ends<input className={eventFieldClass} name="endsAt" type="datetime-local" required aria-describedby="event-time-help" /></label>
      </fieldset>
      <p id="event-time-help" className="text-sm text-mootz-muted">Times use your device timezone and are saved in UTC. Attendance can only be recorded during the event.</p>
      {error && <p role="alert" className="text-sm font-bold text-mootz-deep">{error}</p>}
      <Button type="submit" size="lg" block disabled={create.isPending || (create.error instanceof ApiError && [403, 409].includes(create.error.status))}>{create.isPending ? "Creating…" : submitted ? "Retry same request" : "Create event"}</Button>
      <ButtonLink href="/organizer/events" variant="secondary" block>Back to my events</ButtonLink>
    </form>
  </PageShell>;
}

export function CreateEventPage() { return <OrganizerAccess><CreateEventForm /></OrganizerAccess>; }
