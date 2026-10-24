import type { components } from "@/lib/api/generated/media";
import type { MomentView } from "@/components/ui/moment";

export type ApiMoment = components["schemas"]["Moment"];
export type MomentFilter = "all" | "friends" | "events";
export type LatLng = { latitude: number; longitude: number };

/**
 * UI model shared by Map, Feed and the moment sheet. Built from the API Moment plus
 * whatever author info the client can resolve. `location` is the backend's generalized
 * display location; precise Meet verification coordinates never reach this model.
 */
export type MomentCard = MomentView & {
  id: string;
  authorId: string;
  source: "capture" | "upload";
  location: LatLng | null;
  publishedAt: string | null;
  /** Authored by the viewer. */
  own: boolean;
  /** Event tag. Tagging never grants photo access or collection eligibility. */
  eventId: string | null;
};

const wibDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

/**
 * Whether to offer the Meet entry: own camera moment published today (WIB). The backend
 * re-checks this (MOMENT_INELIGIBLE); this only avoids showing a dead end.
 */
export function canStartMeet(m: MomentCard, now = new Date()): boolean {
  return m.own && m.source === "capture" && !!m.publishedAt && wibDay(new Date(m.publishedAt)) === wibDay(now);
}

export function relativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return "Draft";
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * The API exposes only `authorId`; display names and avatars of other accounts are not
 * available yet (backend gap, tracked for INT-01). Until then non-own authors show a
 * neutral label instead of an invented name.
 */
export function toMomentCard(moment: ApiMoment, viewerId: string | undefined): MomentCard {
  const own = moment.authorId === viewerId;
  return {
    id: moment.id,
    authorId: moment.authorId,
    source: moment.source,
    location: moment.location,
    publishedAt: moment.publishedAt,
    own,
    eventId: moment.eventId,
    author: { name: own ? "You" : "Friend", avatarSrc: null, frame: "lilac" },
    postedLabel: relativeTime(moment.publishedAt),
    backSrc: moment.thumbnails.back ?? null,
    frontSrc: moment.thumbnails.front ?? null,
    caption: moment.caption || null,
    place: moment.location ? "Posted location" : null,
    commentCount: 0,
    dot: null,
  };
}
