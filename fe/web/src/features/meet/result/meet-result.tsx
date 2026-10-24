"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { getBrowseOrigin } from "@/features/shell/browse-origin";
import { Button } from "@/components/ui/button";
import { RecordingStatusRow, type RecordingStatus } from "@/components/ui/status";
import { useApi } from "@/lib/api/use-api";
import { cn } from "@/lib/cn";
import { otherParticipant } from "@/features/dots/dot-parts";
import { useViewerId } from "@/features/dots/queries";
import { friendRef } from "@/features/profile/username";
import { demoPartnerUsername } from "../demo";
import type { MeetResult, OnchainStatus } from "../api";
import { DemoBadge, MeetFrame } from "../ui/meet-frame";
import { clearPayload } from "../ui/nav";

type DotView = { location: { latitude: number; longitude: number } | null; participants: string[]; participantUsernames: (string | null)[] };

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
  const api = useApi();
  const router = useRouter();

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

  const viewerId = useViewerId();
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
  const partner = friendRef(demo ? demoPartnerUsername : dot.data ? otherParticipant(dot.data, viewerId).username : null);

  const leave = () => clearPayload();

  return (
    <MeetFrame title="You made a Dot">
      {demo && <DemoBadge />}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">
      <Bloom />
      <h2 className="max-w-full break-words text-balance text-center font-display text-[32px] leading-tight sm:text-[36px]">{noLocation ? `You and ${partner} met` : `You and ${partner} were here`}</h2>
      <div className="text-center text-[14px] leading-[1.4] text-mootz-muted">
        {accepted && <p>{accepted}</p>}
        {location && <a href={`/map?dot=${dotId ?? ""}`} onClick={leave} className="font-bold text-mootz-deep">Approx. 200 m area</a>}
        {noLocation && <p>No map area · Location not shared</p>}
      </div>

      <div aria-live="polite" className="w-full">
        <RecordingStatusRow status={rowStatus[onchain]} />
      </div>
      {onchain === "not_saved" && (
        <p className="text-sm text-mootz-muted">Not saved onchain. The Dot is unaffected.</p>
      )}
      {onchain === "pending" && !demo && meet.isError && (
        <p className="text-sm text-mootz-muted">Couldn&apos;t refresh the onchain status. The Dot already exists.</p>
      )}
      {noLocation && <p className="text-sm text-mootz-muted">The Dot stays on the moment, not on the map.</p>}
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <Button icon={Check} size="lg" block onClick={() => { leave(); router.push(getBrowseOrigin()); }}>
          Done
        </Button>
      </div>
      <p className="text-[13px] font-bold text-mootz-muted">The Dot already exists. Onchain records can&apos;t be removed.</p>
    </MeetFrame>
  );
}

function Bloom({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative mx-auto grid size-36 shrink-0 place-items-center rounded-full bg-mootz-lilac", className)}>
      <span className="size-20 rounded-full border-[3px] border-white bg-mootz-purple motion-safe:animate-pulse" />
      <span className="absolute bottom-3 left-8 size-14 rounded-full border-[3px] border-white bg-mootz-light" />
      <span className="absolute bottom-3 right-8 size-14 rounded-full border-[3px] border-white bg-mootz-deep" />
    </div>
  );
}
