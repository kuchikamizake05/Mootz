"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Images, LoaderCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedPost } from "@/components/ui/moment";
import { StateMessage } from "@/components/ui/status";
import { canStartMeet } from "@/features/moments/model";
import { useMoments } from "@/features/moments/queries";
import { EventChip } from "@/features/events/event-chip";
import { SupportingMap } from "@/features/map/supporting-map";
import { useViewState } from "@/features/shell/view-state";
import { ReactView } from "@/features/social/react-view";
import { CommentsView } from "@/features/social/comments-view";
import { cn } from "@/lib/cn";

const desktopQuery = "(min-width: 1024px)";
const scrollPositions = new Map<string, number>();
function useIsDesktop() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(desktopQuery);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
}

/**
 * Feed (01.04): full-width posts in one scroll column, same IDs as the Map.
 * "View on map" appears only for moments that shared a posting location.
 */
export function FeedView() {
  const router = useRouter();
  const params = useSearchParams();
  const panel = params.get("panel");
  const { filter, momentId, href } = useViewState();
  const { items, isPending, error, hasNextPage, fetchNextPage, refetch } = useMoments("feed", filter);
  const sentinel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const focused = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((m) => m.id === activeId) ?? items[0];
  const empty = !isPending && !error && items.length === 0;

  useEffect(() => {
    if (!momentId || (panel !== "react" && panel !== "comments")) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = panelRef.current;
    dialog?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(href("/feed", { moment: momentId }), { scroll: false });
      if (event.key !== "Tab" || !dialog) return;
      const targets = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex="0"]'));
      const first = targets[0], last = targets.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus({ preventScroll: true }); };
    // URL values define this overlay's lifetime; href is recreated on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, momentId, filter, router]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = scrollPositions.get(filter) ?? 0;
    return () => { scrollPositions.set(filter, node.scrollTop); };
  }, [filter]);

  useEffect(() => {
    if (!momentId || focused.current === momentId) return;
    const item = list.current?.querySelector<HTMLElement>(`[data-moment-id="${CSS.escape(momentId)}"]`);
    if (!item) return;
    focused.current = momentId;
    item.scrollIntoView({ block: "start", behavior: "instant" });
    if (panel !== "react" && panel !== "comments") item.focus({ preventScroll: true });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) item.animate([{ boxShadow: "inset 0 0 0 2px #6D28D970" }, { boxShadow: "inset 0 0 0 2px #6D28D900" }], { duration: 900 });
  }, [momentId, items, panel]);

  // Desktop only: the supporting map follows the post nearest the top of the column.
  useEffect(() => {
    const root = list.current;
    if (!isDesktop || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = (top?.target as HTMLElement | undefined)?.dataset.momentId;
        if (id) setActiveId(id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    root.querySelectorAll("[data-moment-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isDesktop, items]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && fetchNextPage(), { rootMargin: "600px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  let body;
  if (isPending) {
    body = <StateMessage icon={LoaderCircle} busy title="Loading moments…" className="px-4 pt-6" />;
  } else if (error) {
    body = (
      <StateMessage
        icon={WifiOff}
        title="Your moments couldn’t load."
        actions={<Button onClick={() => refetch()}>Retry</Button>}
        className="px-4 pt-6"
      >
        Retry the Feed without resetting the map.
      </StateMessage>
    );
  } else if (items.length === 0) {
    body = (
      <StateMessage
        icon={Images}
        title="No moments yet."
        className="mx-auto w-full max-w-sm items-center! px-6 py-8 text-center"
      >
        <p>Share both sides of your day.</p>
        <p>Posting is optional; the Feed stays unlocked.</p>
      </StateMessage>
    );
  } else {
    body = (
      <ul ref={list} className="flex flex-col gap-8">
        {items.map((moment) => (
          <li key={moment.id} data-moment-id={moment.id} tabIndex={-1} className="scroll-mt-[76px] outline-none lg:scroll-mt-[104px]">
            <FeedPost
              moment={moment}
              onViewOnMap={moment.location ? () => router.push(href("/map", { moment: moment.id })) : undefined}
              meetHref={canStartMeet(moment) ? `/meet/offer?moment=${moment.id}` : undefined}
              detailHref={`/moments/${moment.id}`}
              onReact={() => router.push(`${href("/feed", { moment: moment.id })}&panel=react`, { scroll: false })}
              onComments={() => router.push(`${href("/feed", { moment: moment.id })}&panel=comments`, { scroll: false })}
              footer={moment.eventId ? <EventChip eventId={moment.eventId} className="mx-4" /> : undefined}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={scroller} className="absolute inset-0 flex flex-col overflow-y-auto pb-32 pt-[72px] lg:pt-[104px]">
      <div inert={!!momentId && (panel === "react" || panel === "comments")} className={cn("mx-auto w-full max-w-[560px]", empty ? "flex flex-1 items-center justify-center" : "lg:grid lg:max-w-[1440px] lg:grid-cols-[minmax(0,560px)_minmax(0,688px)] lg:gap-8 lg:px-16")}>
        <div>
          {body}
          <div ref={sentinel} aria-hidden className="h-1" />
        </div>
        {isDesktop && items.length > 0 && (
          <div className="sticky top-0 self-start">
            <SupportingMap moment={active} onOpen={(id) => router.push(href("/map", { moment: id }))} />
          </div>
        )}
      </div>
      {momentId && (panel === "react" || panel === "comments") && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-mootz-ink/30 lg:items-center" onClick={() => router.replace(href("/feed", { moment: momentId }), { scroll: false })}>
          <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={panel === "react" ? "React to moment" : "Moment comments"} className="max-h-[85dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[32px] bg-mootz-surface outline-none [&>main]:min-h-0 [&>main>div]:min-h-0 lg:rounded-[32px]" onClick={(event) => event.stopPropagation()}>
            {panel === "react" ? <ReactView momentId={momentId} onClose={() => router.replace(href("/feed", { moment: momentId }), { scroll: false })} /> : <CommentsView momentId={momentId} onClose={() => router.replace(href("/feed", { moment: momentId }), { scroll: false })} />}
          </div>
        </div>
      )}
    </div>
  );
}
