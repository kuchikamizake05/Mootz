"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, jsonBody } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import type { ActiveFrame } from "@/features/frames/model";
import { demoCheckIn, demoClaim, demoCollection, demoEquipped, demoEvent, demoEvents, demoStartClaim, demoSubmitCode } from "./demo";
import {
  claimRequestId,
  isTerminal,
  needsNewRequestId,
  resetClaimRequestId,
  type ApiEvent,
  type Authorization,
  type CheckIn,
  type ClaimJob,
  type CollectionState,
  type EquippedCollection,
  type EventPage,
} from "./model";

const mode = env.demoFixtures ? "demo" : "live";
const framesActiveKey = ["frames", "active", mode === "demo" ? "demo" : "me"];

/** Client errors (401/403/404) won't change on retry; 503 and network errors get a couple of tries. */
const retry = (count: number, error: unknown) =>
  !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2;

function useEnabled() {
  const { ready, authenticated } = usePrivy();
  return env.demoFixtures || (ready && authenticated);
}

/** Stable "now" for one mount; avoids impure Date.now() calls during render. */
export function useNow() {
  const [now] = useState(() => Date.now());
  return now;
}

export function useEvents() {
  const api = useApi();
  const enabled = useEnabled();
  return useQuery({
    queryKey: ["events", mode, "list"],
    enabled,
    retry,
    queryFn: async (): Promise<ApiEvent[]> => {
      if (env.demoFixtures) return demoEvents();
      const items: ApiEvent[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 4; i++) {
        const params = new URLSearchParams({ limit: "50" });
        if (cursor) params.set("cursor", cursor);
        const page: EventPage = await api<EventPage>(`/v1/events?${params}`);
        items.push(...page.items);
        cursor = page.nextCursor;
        if (!cursor) break;
      }
      return items;
    },
  });
}

export function useEvent(id: string) {
  const api = useApi();
  const enabled = useEnabled();
  return useQuery({
    queryKey: ["events", mode, "detail", id],
    enabled,
    retry,
    queryFn: async (): Promise<ApiEvent> => {
      if (env.demoFixtures) {
        const event = demoEvent();
        if (id !== event.id) throw new ApiError(404, "NOT_FOUND", null);
        return event;
      }
      return api<ApiEvent>(`/v1/events/${id}`);
    },
  });
}

export function useCheckIn(id: string) {
  const api = useApi();
  const enabled = useEnabled();
  return useQuery({
    queryKey: ["events", mode, "check-in", id],
    enabled,
    retry,
    queryFn: async (): Promise<CheckIn> => (env.demoFixtures ? demoCheckIn() : api<CheckIn>(`/v1/events/${id}/check-in`)),
  });
}

/** Demo only: the live API records check-in through the organizer (POST /v1/events/:id/check-ins). */
export function useDemoCheckIn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => demoSubmitCode(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", mode, "check-in", id] }).then(() => qc.invalidateQueries({ queryKey: ["events", mode, "collection", id] })),
  });
}

/** Live eligibility, supply and ownership. A 503 is an error state, never "not owned" or zero. */
export function useCollection(id: string) {
  const api = useApi();
  const enabled = useEnabled();
  return useQuery({
    queryKey: ["events", mode, "collection", id],
    enabled,
    retry,
    queryFn: async (): Promise<CollectionState> => (env.demoFixtures ? demoCollection() : api<CollectionState>(`/v1/events/${id}/collection`)),
  });
}

/**
 * Authorization -> queue -> poll. Ownership is reported only through the polled claim status
 * (receipt and readback confirmed by the backend); an authorization or a queued job is not ownership.
 */
export function useClaim(id: string) {
  const api = useApi();
  const qc = useQueryClient();
  const [claimId, setClaimId] = useState<string | null>(null);
  const collectionKey = ["events", mode, "collection", id];
  const claimKey = ["events", mode, "claim", id, claimId];

  const start = useMutation({
    mutationFn: async (): Promise<ClaimJob> => {
      if (env.demoFixtures) return demoStartClaim();
      const authorization = await api<Authorization>(`/v1/events/${id}/claim-authorizations`, jsonBody({ clientRequestId: claimRequestId(id) }));
      return api<ClaimJob>(`/v1/events/${id}/claims`, jsonBody({ authorizationId: authorization.authorizationId }));
    },
    onSuccess: (job) => {
      qc.setQueryData(claimKey.slice(0, 4).concat(job.claimId), job);
      setClaimId(job.claimId);
    },
    onError: (error) => {
      if (needsNewRequestId(error)) resetClaimRequestId(id);
    },
  });

  const status = useQuery({
    queryKey: claimKey,
    enabled: claimId !== null,
    retry: false,
    // Back off from 2 s to 15 s, stop on a terminal state or after ~40 checks.
    refetchInterval: (query) =>
      isTerminal(query.state.data) || query.state.dataUpdateCount > 40 ? false : Math.min(2000 * 1.4 ** query.state.dataUpdateCount, 15000),
    queryFn: async (): Promise<ClaimJob> => {
      const job = env.demoFixtures ? demoClaim() : await api<ClaimJob>(`/v1/events/${id}/claims/${claimId}`);
      if (job.status === "included" || job.status === "already_owned") {
        resetClaimRequestId(id);
        void qc.invalidateQueries({ queryKey: collectionKey });
      }
      return job;
    },
  });

  /** Forget a failed attempt so the next claim uses a fresh authorization. */
  const reset = () => {
    resetClaimRequestId(id);
    setClaimId(null);
    start.reset();
  };

  return { start, status, claimId, reset, job: status.data } as const;
}

/** Wear a collection as the profile frame. A failure leaves the cached (previous) frame untouched. */
export function useWear() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (collectionRef: string | null): Promise<EquippedCollection | null> => {
      if (env.demoFixtures) return collectionRef ? demoEquipped() : null;
      if (!collectionRef) {
        await api("/v1/me/equipped-collection", { method: "DELETE" });
        return null;
      }
      return (await api<{ equipped: EquippedCollection | null }>("/v1/me/equipped-collection", jsonBody({ collectionRef }, "PUT"))).equipped;
    },
    onSuccess: (equipped) => {
      const frame: ActiveFrame = equipped ? { kind: "collection", ...equipped } : null;
      qc.setQueryData(framesActiveKey, frame);
      if (!env.demoFixtures) void qc.invalidateQueries({ queryKey: ["frames"] });
    },
  });
}
