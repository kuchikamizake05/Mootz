"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ButtonLink } from "@/components/ui/button";
import { RecordingStatusRow, type RecordingStatus } from "@/components/ui/status";
import { useApi } from "@/lib/api/use-api";
import { cn } from "@/lib/cn";
import type { MeetResult, OnchainStatus } from "../api";
import { DemoBadge, MeetFrame } from "../ui/meet-frame";
import { clearPayload } from "../ui/nav";

type DotView = { location: { latitude: number; longitude: number } | null };

const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "22 Oct 2026 · 14:03 WIB" from the server's acceptedAt (never the client clock). */
export function formatAccepted(iso: string) {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : `${dateFormat.format(at)} · ${timeFormat.format(at)} WIB`;
}

const rowStatus: Record<OnchainStatus, RecordingStatus> = { pending: "pending", recorded: "saved", not_saved: "off" };
const POLL_MS = 5000;
// 5 minutes of pending polling (the relay gives up after 300 s), counted in fetches.
const MAX_POLLS = 60;

/**
 * "You made a Dot" for poster and scanner. The Dot already exists; this only reports the
 * optional onchain record. The API doesn't say why a record is not saved, so the copy
 * never claims whose choice it was, and there is no retry.
 */
export function MeetResultView({ meetId, initial, demo }: { meetId: string; initial?: MeetResult; demo?: boolean }) {
  const router = useRouter();
  const api = useApi();

  const meet = useQuery({
    queryKey: ["meet", meetId],
    queryFn: () => api<MeetResult>(`/v1/meets/${meetId}`),
    enabled: !demo,
    placeholderData: initial,
    refetchInterval: (query) => {
      const status = query.state.data?.onchainStatus ?? initial?.onchainStatus;
      return status === "pending" && query.state.dataUpdateCount < MAX_POLLS ? POLL_MS : false;
    },
  });
  const dotId = meet.data?.dotId ?? initial?.dotId;
  const dot = useQuery({
    queryKey: ["dot", dotId],
    queryFn: () => api<DotView>(`/v1/dots/${dotId}`),
    enabled: !demo && !!dotId,
  });

  const [demoSaved, setDemoSaved] = useState(false);
  useEffect(() => {
    if (!demo) return;
    const timer = setTimeout(() => setDemoSaved(true), 4000);
    return () => clearTimeout(timer);
  }, [demo]);

  const onchain: OnchainStatus = demo ? (demoSaved ? "recorded" : "pending") : (meet.data?.onchainStatus ?? "pending");
  const acceptedAt = demo ? "2026-10-22T07:03:00Z" : meet.data?.acceptedAt;
  const accepted = acceptedAt ? formatAccepted(acceptedAt) : null;
  // null while unknown; the area line and map button appear only for a Dot with a location.
  const location = demo ? { latitude: -7.7713, longitude: 110.3775 } : dot.data ? dot.data.location : undefined;
  const noLocation = location === null;

  const leave = () => clearPayload();

  return (
    <MeetFrame title="You made a Dot" onClose={() => { leave(); router.push("/map"); }}>
      {demo && <DemoBadge />}
      <Bloom />
      <h2 className="font-display text-[44px] leading-[1.02]">{noLocation ? "You and your friend met" : "You and your friend were here"}</h2>
      <div className="text-[15px] text-mootz-muted">
        {accepted && <p>{accepted}</p>}
        {location && <p>Approx. 200 m area</p>}
        {noLocation && <p>No map area · Location not shared</p>}
      </div>

      <div aria-live="polite">
        <RecordingStatusRow status={rowStatus[onchain]} />
      </div>
      {onchain === "not_saved" && (
        <p className="text-sm text-mootz-muted">Not saved onchain. The Dot is unaffected.</p>
      )}
      {onchain === "pending" && !demo && meet.isError && (
        <p className="text-sm text-mootz-muted">Couldn&apos;t refresh the onchain status. The Dot already exists.</p>
      )}
      {noLocation && <p className="text-sm text-mootz-muted">The Dot stays on the moment, not on the map.</p>}

      <div className="flex flex-col gap-2">
        {location && (
          <ButtonLink size="lg" block href="/map" onClick={leave}>
            View on map
          </ButtonLink>
        )}
        <ButtonLink variant={location ? "secondary" : "primary"} size="lg" block href="/map" onClick={leave}>
          Done
        </ButtonLink>
      </div>
      <p className="text-xs font-bold text-mootz-muted">The Dot already exists. Onchain records can&apos;t be removed.</p>
    </MeetFrame>
  );
}

function Bloom({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative mx-auto grid size-[184px] place-items-center rounded-full bg-mootz-lilac", className)}>
      <span className="size-20 rounded-full border-[3px] border-white bg-mootz-purple motion-safe:animate-pulse" />
      <span className="absolute bottom-3 left-8 size-14 rounded-full border-[3px] border-white bg-mootz-light" />
      <span className="absolute bottom-3 right-8 size-14 rounded-full border-[3px] border-white bg-mootz-deep" />
    </div>
  );
}
