import type { components } from "@/lib/api/generated/dots";
import type { RecordingStatus } from "@/components/ui/status";

export type Dot = components["schemas"]["Dot"];
export type DotPage = { items: Dot[]; nextCursor: string | null };
export type DotSummary = { dotCount: number; uniquePartners: number };

/** The API never discloses hidden_by, so the client remembers who hid a Dot (see store.ts). */
export type HiddenMark = "me" | "other";

/** Onchain record state is separate from the Dot. "saved" only when the record matches. */
export function recordingStatus(dot: Dot): Extract<RecordingStatus, "saved" | "pending" | "off"> {
  if (dot.onchainStatus === "not_saved") return "off";
  if (dot.onchainStatus === "recorded" && dot.recorded) return "saved";
  return "pending";
}

export const isFinal = (dot: Dot) => dot.finality === "finalized" && dot.chainOutcome === "success";

export const countLabel = (n: number) => `${n} ${n === 1 ? "Dot" : "Dots"}`;

const zone = { timeZone: "Asia/Jakarta" } as const;

function parts(iso: string) {
  const f = new Intl.DateTimeFormat("en-GB", { ...zone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  return Object.fromEntries(f.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
}

/** "22 Oct 2026 · 14:03 WIB" */
export function formatDotWhen(iso: string) {
  const p = parts(iso);
  return `${p.day} ${p.month} ${p.year} · ${p.hour}:${p.minute} WIB`;
}

/** "22 Oct" for list rows */
export function formatDotDay(iso: string) {
  const p = parts(iso);
  return `${p.day} ${p.month}`;
}

export const areaLabel = (dot: Dot) => (dot.location ? "Approx. 200 m area" : "No display location");
