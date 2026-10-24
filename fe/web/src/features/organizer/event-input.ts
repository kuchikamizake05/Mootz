import type { components } from "../../lib/api/generated/events";

export type EventDraft = { title: string; description: string; startsAt: string; endsAt: string; locationLabel: string; latitude: string; longitude: string };

/** datetime-local is interpreted in the organizer's browser timezone, then sent as UTC. */
export function eventInput(draft: EventDraft, clientRequestId: string, now: number): components["schemas"]["CreateEvent"] {
  const title = draft.title.trim();
  const starts = new Date(draft.startsAt); const ends = new Date(draft.endsAt);
  if (!title || title.length > 200) throw Error("Enter an event title of up to 200 characters.");
  if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts || ends.getTime() <= now) throw Error("Choose a valid event window that ends in the future and after its start.");
  if (draft.description.length > 10000 || draft.locationLabel.length > 200) throw Error("Shorten the description or venue name.");
  const latitude = Number(draft.latitude); const longitude = Number(draft.longitude);
  if (!draft.latitude.trim() || !draft.longitude.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw Error("Choose a venue location on the map or enter valid coordinates.");
  return { location: { latitude, longitude }, clientRequestId, title, description: draft.description.trim(), locationLabel: draft.locationLabel.trim() || null, startsAt: starts.toISOString(), endsAt: ends.toISOString() };
}
