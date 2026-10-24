"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BottomActions } from "@/components/ui/controls";
import { ViewSwitch } from "@/components/ui/view-switch";
import { FilterSheet } from "@/features/events/filter-sheet";
import { avatarFrame } from "@/features/frames/model";
import { useActiveFrame } from "@/features/frames/queries";
import { UsernamePrompt } from "@/features/profile/username-prompt";
import { useViewerIdentity } from "@/features/profile/viewer";
import { env } from "@/lib/env";
import { useViewState } from "./view-state";
import { rememberBrowseOrigin } from "./browse-origin";
import { cn } from "@/lib/cn";

/**
 * Shared Map/Feed shell (01.01, 01.04): wordmark, Map | Feed switch and own avatar on top,
 * Events · Camera · Scan to Meet at the bottom. The bottom row gives way to the moment
 * sheet while a moment is selected. Pages fill the space in between.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { pathname, filter, href } = useViewState();
  const params = useSearchParams();
  const panel = params.get("panel");
  const search = params.toString();
  const overlayOpen = pathname.startsWith("/feed") && (panel === "react" || panel === "comments");
  const active = pathname.startsWith("/feed") ? "feed" : "map";
  const [filterOpen, setFilterOpen] = useState(false);
  const viewer = useViewerIdentity();
  const frame = useActiveFrame();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-mootz-surface">
      <header inert={overlayOpen || filterOpen} className={cn("pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[76px] items-start justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] lg:h-[88px] lg:items-center lg:px-8 lg:pt-0", active === "feed" && "bg-mootz-surface lg:border-b lg:border-mootz-hairline")}>
        <Link href={href("/map", { moment: null })} className="pointer-events-auto" aria-label="Mootz home">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
          <img src="/brand/mootz-symbol-v1.svg" alt="" width={46} height={36} className="mt-0.5 h-9 w-[46px] object-contain lg:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
          <img src="/brand/mootz-logo-v1.svg" alt="" width={148} height={38} className="hidden h-[38px] w-[148px] object-contain lg:block" />
        </Link>
        <div className="absolute left-1/2 -translate-x-1/2">
        <ViewSwitch
          active={active}
          hrefs={{ map: href("/map"), feed: href("/feed", { moment: null }) }}
          className="pointer-events-auto"
        />
        </div>
        <Link href="/profile" onClick={rememberBrowseOrigin} aria-label="Your profile" className="pointer-events-auto rounded-full">
          <Avatar name={viewer.avatarName} src={viewer.avatarSrc} frame={avatarFrame(frame.data ?? undefined)} size={44} />
        </Link>
      </header>

      {!overlayOpen && <UsernamePrompt next={search ? `${pathname}?${search}` : pathname} />}

      {env.demoFixtures && (
        <p className="sr-only lg:not-sr-only lg:absolute lg:right-[92px] lg:top-8 lg:z-30 lg:text-xs lg:text-mootz-muted">
          Demo fixtures · fictional people
        </p>
      )}

      <main className="relative flex-1">{children}</main>

        <div inert={overlayOpen || filterOpen} className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center pb-[max(12px,env(safe-area-inset-bottom))]">
          <BottomActions
            className="pointer-events-auto"
            onEvents={() => setFilterOpen(true)}
            onPost={() => { rememberBrowseOrigin(); router.push("/capture"); }}
            onScan={() => { rememberBrowseOrigin(); router.push("/meet/scan"); }}
          />
        </div>
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
