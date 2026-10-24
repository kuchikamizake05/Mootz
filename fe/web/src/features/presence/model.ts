import type { components } from "@/lib/api/generated/presence";

export type FriendLocation = components["schemas"]["FriendLocation"];
export type LocationSharing = components["schemas"]["LocationSharing"];
export const PRESENCE_INTERVAL_MS = 5000;
export function freshLocations(items: FriendLocation[], now: number) {
  return items.filter(item => Date.parse(item.expiresAt) > now);
}
export const friendLabel = (item: FriendLocation) => item.displayName || `Friend …${item.accountId.slice(-4)}`;
export function locationAge(updatedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(updatedAt)) / 1000));
  return seconds < 5 ? "Updated just now" : `Updated ${seconds}s ago`;
}
