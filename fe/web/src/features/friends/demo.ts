import type { Relationship } from "./model";

/** Demo fixtures: 2 friends and 1 incoming request. Fictional account IDs. */
export const DEMO_OWN_CODE = "00000000-0000-4000-8000-0000000000a1";
export const DEMO_OWN_USERNAME = "faaid";
/** Handles the demo "backend" knows; anything else answers 404. */
export const DEMO_KNOWN_USERNAMES = ["demo_a", "demo_b", "demo_c", "demo_d", "demo_e"];
const at = "2026-10-20T08:00:00Z";
export const demoRelationships: Relationship[] = [
  { accountId: "00000000-0000-4000-8000-0000000000b1", username: "demo_a", status: "accepted", direction: "outgoing", createdAt: at, updatedAt: at },
  { accountId: "00000000-0000-4000-8000-0000000000b2", username: "demo_b", status: "accepted", direction: "incoming", createdAt: at, updatedAt: at },
  { accountId: "00000000-0000-4000-8000-0000000000b3", username: "demo_c", status: "pending", direction: "incoming", createdAt: at, updatedAt: at },
];
