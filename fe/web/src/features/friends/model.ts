import type { components } from "@/lib/api/generated/friends";

export type Relationship = components["schemas"]["Relationship"];
export type FriendPage = { items: Relationship[]; nextCursor: string | null };

export { UUID } from "@/features/profile/username";

export function groupFriends(items: Relationship[]) {
  return {
    incoming: items.filter((r) => r.status === "pending" && r.direction === "incoming"),
    outgoing: items.filter((r) => r.status === "pending" && r.direction === "outgoing"),
    friends: items.filter((r) => r.status === "accepted"),
  };
}

/** Fallback tail for accounts that have no username yet. */
export const shortCode = (id: string) => `…${id.slice(-4)}`;
