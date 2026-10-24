import type { Dot, HiddenMark } from "./model";

/**
 * Labelled demo fixtures (NEXT_PUBLIC_DEMO_FIXTURES=1). Fictional accounts; moment IDs match
 * the demo moments so the linked moment card resolves for the first two.
 */
export const DEMO_VIEWER_ID = "demo-me";
const base = { meetId: "00000000-0000-4000-8000-0000000000f1", participants: [DEMO_VIEWER_ID, "demo-friend"] as [string, string] };
const loc = { latitude: -7.7713, longitude: 110.3775 };

export const demoDots: Dot[] = [
  { ...base, id: "00000000-0000-4000-8000-0000000000d1", momentId: "00000000-0000-4000-8000-00000000000a", createdAt: "2026-10-22T07:03:00Z", onchainStatus: "recorded", recorded: true, finality: "finalized", chainOutcome: "success", hidden: false, location: loc },
  { ...base, id: "00000000-0000-4000-8000-0000000000d2", momentId: "00000000-0000-4000-8000-00000000000b", createdAt: "2026-10-22T05:40:00Z", onchainStatus: "pending", recorded: false, finality: "unverified", chainOutcome: "pending", hidden: false, location: { latitude: -7.7731, longitude: 110.3808 } },
  { ...base, id: "00000000-0000-4000-8000-0000000000d3", momentId: "00000000-0000-4000-8000-0000000000e3", createdAt: "2026-10-21T10:15:00Z", onchainStatus: "not_saved", recorded: false, finality: "unverified", chainOutcome: "unverified", hidden: false, location: { latitude: -7.7672, longitude: 110.3757 } },
  { ...base, id: "00000000-0000-4000-8000-0000000000d4", momentId: "00000000-0000-4000-8000-0000000000e4", createdAt: "2026-10-20T09:00:00Z", onchainStatus: "not_saved", recorded: false, finality: "unverified", chainOutcome: "unverified", hidden: false, location: null },
  { ...base, id: "00000000-0000-4000-8000-0000000000d5", momentId: "00000000-0000-4000-8000-0000000000e5", createdAt: "2026-10-19T08:00:00Z", onchainStatus: "recorded", recorded: true, finality: "included", chainOutcome: "success", hidden: true, location: loc },
  { ...base, id: "00000000-0000-4000-8000-0000000000d6", momentId: "00000000-0000-4000-8000-0000000000e6", createdAt: "2026-10-18T08:00:00Z", onchainStatus: "recorded", recorded: true, finality: "finalized", chainOutcome: "success", hidden: true, location: loc },
];

/** d5 is hidden by the viewer, d6 by the other participant. */
export const demoMarks: Record<string, HiddenMark> = {
  "00000000-0000-4000-8000-0000000000d5": "me",
  "00000000-0000-4000-8000-0000000000d6": "other",
};
