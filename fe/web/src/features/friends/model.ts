import type { components } from "@/lib/api/generated/friends";

export type Relationship = components["schemas"]["Relationship"];
export type FriendPage = { items: Relationship[]; nextCursor: string | null };

/** A friend code is the account ID; that is the only identifier POST /v1/friends/requests accepts. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function groupFriends(items: Relationship[]) {
  return {
    incoming: items.filter((r) => r.status === "pending" && r.direction === "incoming"),
    outgoing: items.filter((r) => r.status === "pending" && r.direction === "outgoing"),
    friends: items.filter((r) => r.status === "accepted"),
  };
}

/** Names aren't exposed by the API; a short code tail tells accounts apart. */
export const shortCode = (id: string) => `…${id.slice(-4)}`;
