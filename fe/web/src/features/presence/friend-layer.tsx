"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapMarker } from "@/features/map/map-marker";
import { useApi, useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { cn } from "@/lib/cn";
import { freshLocations, friendLabel, locationAge, PRESENCE_INTERVAL_MS, type FriendLocation } from "./model";
import { presenceCopy, usePresenceStatus } from "./provider";

export function FriendLocationLayer({ map }: { map: MapLibreMap | null }) {
  const api = useApi();
  const profile = useProfile();
  const status = usePresenceStatus();
  const [now, setNow] = useState(0);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = panel.current;
    const host = node?.parentElement;
    if (!node || !host) return;
    const observer = new ResizeObserver(() => host.style.setProperty("--friend-panel-height", `${node.offsetHeight}px`));
    observer.observe(node);
    return () => {
      observer.disconnect();
      host.style.removeProperty("--friend-panel-height");
    };
  }, []);
  const query = useQuery({
    queryKey: ["friend-locations", profile.data?.id],
    queryFn: () => api<{ items: FriendLocation[] }>("/v1/friends/locations"),
    enabled: !env.demoFixtures && !!profile.data,
    refetchInterval: PRESENCE_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  // A failed authorization/read must never leave another person's cached position visible.
  const items = query.isError || now === 0 ? [] : freshLocations(query.data?.items ?? [], now);
  const focus = (item: FriendLocation) => map?.flyTo({ center: [item.longitude, item.latitude], zoom: 16 });
  return (
    <>
      {map && items.map(item => (
        <MapMarker key={item.accountId} map={map} latitude={item.latitude} longitude={item.longitude} zIndex={3}>
          <button type="button" aria-label={`${friendLabel(item)}, approximate location, ${locationAge(item.updatedAt, now)}`}
            onClick={() => { focus(item); setOpen(true); }} className="flex flex-col items-center rounded-full text-mootz-deep">
            <Avatar src={item.avatarUrl} name={friendLabel(item)} size={44} frame="lilac" />
            <span className="rounded-full border border-mootz-hairline bg-white px-2 py-1 text-xs font-bold">{friendLabel(item)}</span>
          </button>
        </MapMarker>
      ))}
      <aside ref={panel} className="absolute left-4 top-[84px] z-20 w-[min(280px,calc(100%-96px))] overflow-hidden rounded-2xl border border-mootz-hairline bg-white text-mootz-ink shadow-float" aria-label="Friend locations">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left text-sm font-extrabold">
          <Users aria-hidden size={18} className="shrink-0 text-mootz-deep" />
          <span className="min-w-0 flex-1">Friends on map</span>
          <span className="rounded-full bg-mootz-lilac px-2 py-0.5 text-xs text-mootz-deep">{items.length}</span>
          {query.isFetching && <span className="sr-only">Updating friend locations</span>}
          <ChevronDown aria-hidden size={16} className={cn("shrink-0 text-mootz-deep", open && "rotate-180")} />
        </button>
        {open && <div className="flex max-h-[45dvh] flex-col gap-3 overflow-y-auto border-t border-mootz-hairline p-3 text-sm">
          <p className="text-xs leading-relaxed text-mootz-muted">{env.demoFixtures ? "Preview only · no live locations." : presenceCopy[status]}</p>
          <Link href="/profile" className="flex min-h-11 items-center font-bold text-mootz-deep underline">Manage my sharing</Link>
          {query.isError ? <div className="flex flex-col items-start gap-3"><p role="alert">Could not load friend locations.</p><Button onClick={() => void query.refetch()}>Retry</Button></div> :
            query.isPending && !env.demoFixtures ? <p>Loading friend locations…</p> :
            items.length === 0 ? <p>No friends are sharing a recent location. They need to open Mootz and allow location access.</p> :
            <ul>{items.map(item => <li key={item.accountId}>
              <button type="button" onClick={() => focus(item)} className="min-h-11 w-full rounded-xl py-2 text-left">
                <span className="block font-bold">{friendLabel(item)}</span>
                <span className="text-xs text-mootz-muted">Approximate area · {locationAge(item.updatedAt, now)}</span>
              </button>
            </li>)}</ul>}
        </div>}
      </aside>
    </>
  );
}
