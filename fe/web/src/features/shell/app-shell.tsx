"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BottomActions } from "@/components/ui/controls";
import { ViewSwitch } from "@/components/ui/view-switch";
import { FilterSheet } from "@/features/events/filter-sheet";
import { avatarFrame } from "@/features/frames/model";
import { useActiveFrame } from "@/features/frames/queries";
import { useViewerIdentity } from "@/features/profile/viewer";
import { env } from "@/lib/env";
import { useViewState } from "./view-state";

/**
 * Shared Map/Feed shell (01.01, 01.04): wordmark, Map | Feed switch and own avatar on top,
 * Events · Camera · Scan to Meet at the bottom. The bottom row gives way to the moment
 * sheet while a moment is selected. Pages fill the space in between.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { pathname, momentId, filter, href } = useViewState();
  const active = pathname.startsWith("/feed") ? "feed" : "map";
  const [filterOpen, setFilterOpen] = useState(false);
  const viewer = useViewerIdentity();
  const frame = useActiveFrame();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-mootz-surface">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <Link href={href("/map", { moment: null })} className="pointer-events-auto" aria-label="Mootz home">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
          <img src="/brand/mootz-logo-v1.svg" alt="" width={86} height={30} className="h-[30px] w-auto" />
        </Link>
        <ViewSwitch
          active={active}
          hrefs={{ map: href("/map"), feed: href("/feed", { moment: null }) }}
          className="pointer-events-auto"
        />
        <Link href="/profile" aria-label="Your profile" className="pointer-events-auto rounded-full">
          <Avatar name={viewer.name} src={viewer.avatarSrc} frame={avatarFrame(frame.data ?? undefined)} size={44} />
        </Link>
      </header>

      {env.demoFixtures && (
        <p className="absolute left-1/2 top-[72px] z-30 -translate-x-1/2 rounded-full bg-mootz-ink/80 px-3 py-0.5 text-xs text-white">
          Demo fixtures · fictional people
        </p>
      )}

      <main className="relative flex-1">{children}</main>

      {!momentId && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center pb-[max(12px,env(safe-area-inset-bottom))]">
          <BottomActions
            className="pointer-events-auto"
            onEvents={() => setFilterOpen(true)}
            onPost={() => router.push("/capture")}
            onScan={() => router.push("/meet/scan")}
          />
        </div>
      )}
      {filterOpen && (
        <FilterSheet
          value={filter}
          onChange={(next) => router.replace(href(pathname, { filter: next }), { scroll: false })}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  );
}
