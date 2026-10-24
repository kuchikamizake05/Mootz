"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Images, LoaderCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostMomentButton } from "@/components/ui/controls";
import { FeedPost } from "@/components/ui/moment";
import { StateMessage } from "@/components/ui/status";
import { canStartMeet } from "@/features/moments/model";
import { useMoments } from "@/features/moments/queries";
import { EventChip } from "@/features/events/event-chip";
import { SupportingMap } from "@/features/map/supporting-map";
import { useViewState } from "@/features/shell/view-state";

const desktopQuery = "(min-width: 1024px)";
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
  const { filter, href } = useViewState();
  const { items, isPending, error, hasNextPage, fetchNextPage, refetch } = useMoments("feed", filter);
  const sentinel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const isDesktop = useIsDesktop();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((m) => m.id === activeId) ?? items[0];

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
        actions={<PostMomentButton size={64} onClick={() => router.push("/capture")} />}
        className="px-4 pt-6"
      >
        <p>Share both sides of your day.</p>
        <p>Posting is optional; the Feed stays unlocked.</p>
      </StateMessage>
    );
  } else {
    body = (
      <ul ref={list} className="flex flex-col gap-8">
        {items.map((moment) => (
          <li key={moment.id} data-moment-id={moment.id}>
            <FeedPost
              moment={moment}
              onViewOnMap={moment.location ? () => router.push(href("/map", { moment: moment.id })) : undefined}
              meetHref={canStartMeet(moment) ? `/meet/offer?moment=${moment.id}` : undefined}
              detailHref={`/moments/${moment.id}`}
              onReact={() => router.push(`/moments/${moment.id}/react`)}
              onComments={() => router.push(`/moments/${moment.id}/comments`)}
              footer={moment.eventId ? <EventChip eventId={moment.eventId} className="mx-4" /> : undefined}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto pb-32 pt-[84px]">
      <div className="mx-auto w-full max-w-[560px] lg:grid lg:max-w-[1312px] lg:grid-cols-[560px_1fr] lg:gap-8 lg:px-8">
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
    </div>
  );
}
