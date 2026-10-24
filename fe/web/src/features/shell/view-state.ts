"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { MomentFilter } from "@/features/moments/model";

const filters: MomentFilter[] = ["all", "friends", "events"];

/**
 * Browsing state lives in the URL so Map/Feed switching, back/forward and refresh keep it:
 * - `filter`: all | friends | events (shared by Map and Feed)
 * - `moment`: selected moment ID (opens the sheet on Map)
 */
export function useViewState() {
  const params = useSearchParams();
  const pathname = usePathname();
  const raw = params.get("filter");
  const filter: MomentFilter = filters.includes(raw as MomentFilter) ? (raw as MomentFilter) : "all";
  const momentId = params.get("moment");

  /** Builds an href that keeps the current filter; pass `moment: null` to clear the selection. */
  const href = (path: string, next: { filter?: MomentFilter; moment?: string | null } = {}) => {
    const q = new URLSearchParams();
    const f = next.filter ?? filter;
    if (f !== "all") q.set("filter", f);
    const m = next.moment === undefined ? (path === pathname ? momentId : null) : next.moment;
    if (m) q.set("moment", m);
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };

  return { filter, momentId, pathname, href };
}
