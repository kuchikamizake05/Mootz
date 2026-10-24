import type { components } from "@/lib/api/generated/comments";
import { personName } from "@/features/profile/username";
import { ApiError } from "@/lib/api/client";

export type ApiComment = components["schemas"]["Comment"];
export type Page<T> = { items: T[]; nextCursor: string | null };
export type SelfieItem = { id: string; createdAt: string; thumbnailUrl: string };
export type ReactionItem = { id: string; accountId: string; username: string | null; createdAt: string; thumbnailUrl: string };

/** API limit: 1 to 500 Unicode code points after trimming. */
export const MAX_COMMENT = 500;
export const codePoints = (text: string) => Array.from(text).length;

/** "You", the @username, or "Friend" when that account has none; never an invented name. */
export const personLabel = (accountId: string, viewerId: string | undefined, username?: string | null) => personName({ id: accountId, username, viewerId });

export type ReplyTarget = { commentId: string; label: string };

export type Thread = { root: ApiComment; replies: ApiComment[] };

/** Comments the viewer can see: live roots plus live replies. Tombstones are not counted. */
export function countComments(threads: Thread[]) {
  return threads.reduce((n, t) => n + (t.root.deleted ? 0 : 1) + t.replies.filter((r) => !r.deleted).length, 0);
}

export function errorCopy(error: unknown, what: string): string {
  if (error instanceof ApiError) {
    if (error.needsLogin) return "Your session expired. Sign in again, then retry.";
    if (error.status === 404) return "This moment isn't available to you.";
    if (error.status === 429) return "Too many requests. Wait a minute, then retry.";
    if (error.unavailable) return "Mootz is temporarily unavailable. Retry in a moment.";
    if (error.status === 0) return "No connection. Check your network and retry.";
  }
  return `${what} couldn't be completed. Try again.`;
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

export const libraryLabel = (index: number) => `Saved ${String(index + 1).padStart(2, "0")}`;
