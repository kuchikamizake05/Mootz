"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { ApiError, jsonBody } from "@/lib/api/client";
import { useApi, useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { DEMO_VIEWER_ID, demoDots } from "./demo";
import type { Dot, DotPage, DotSummary } from "./model";
import { markKey, setDemoHidden, setMark, useDemoHidden, useHiddenMark } from "./store";

/** Viewer account ID (demo: fictional). Undefined until the profile loads. */
export function useViewerId() {
  const profile = useProfile();
  return env.demoFixtures ? DEMO_VIEWER_ID : profile.data?.id;
}

function useEnabled() {
  const { ready, authenticated } = usePrivy();
  const viewerId = useViewerId();
  return { enabled: !env.demoFixtures && ready && authenticated && !!viewerId, viewerId };
}

/** Your Dots, newest first. Hidden Dots stay in this list. */
export function useDots() {
  const api = useApi();
  const { enabled, viewerId } = useEnabled();
  const demoHidden = useDemoHidden();
  const query = useInfiniteQuery({
    queryKey: ["dots", "list", viewerId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (pageParam) params.set("cursor", pageParam);
      return api<DotPage>(`/v1/dots?${params}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });

  if (env.demoFixtures) {
    const items = demoDots.map((d) => ({ ...d, hidden: demoHidden[d.id] ?? d.hidden }));
    return { items, isPending: false, error: null, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: async () => {}, refetch: async () => {} } as const;
  }
  return {
    items: query.data?.pages.flatMap((p) => p.items) ?? [],
    isPending: query.isPending,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  } as const;
}

/**
 * Dots to draw on the Map (`map=true`): the backend already excludes hidden Dots, Dots
 * whose moment didn't share a location and Meets without an approximate display area.
 */
export function useMapDots() {
  const api = useApi();
  const { enabled, viewerId } = useEnabled();
  const demoHidden = useDemoHidden();
  const query = useQuery({
    queryKey: ["dots", "map", viewerId],
    queryFn: () => api<DotPage>("/v1/dots?map=true&limit=50"),
    enabled,
  });
  if (env.demoFixtures) return demoDots.filter((d) => d.location && !(demoHidden[d.id] ?? d.hidden));
  return (query.data?.items ?? []).filter((d) => d.location && !d.hidden);
}

/** Counts Meets, including hidden and not-saved Dots. */
export function useDotSummary() {
  const api = useApi();
  const { enabled, viewerId } = useEnabled();
  const { items } = useDots();
  const query = useQuery({
    queryKey: ["dots", "summary", viewerId],
    queryFn: () => api<DotSummary>("/v1/me/dots/summary"),
    enabled,
  });
  if (env.demoFixtures) return { count: items.length, isPending: false } as const;
  return { count: query.data?.dotCount ?? null, isPending: query.isPending } as const;
}

/** One Dot. 404 means absent or outside the audience. */
export function useDot(id: string) {
  const api = useApi();
  const { enabled, viewerId } = useEnabled();
  const demoHidden = useDemoHidden();
  const query = useQuery({
    queryKey: ["dots", "detail", id, viewerId],
    queryFn: () => api<Dot>(`/v1/dots/${id}`),
    enabled,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  if (env.demoFixtures) {
    const d = demoDots.find((x) => x.id === id);
    return { dot: d ? { ...d, hidden: demoHidden[d.id] ?? d.hidden } : undefined, isPending: false, error: d ? null : new ApiError(404, "NOT_FOUND", null), refetch: async () => {} } as const;
  }
  return { dot: query.data, isPending: query.isPending, error: query.error, refetch: query.refetch } as const;
}

/**
 * Hide or restore. Hiding is remembered as "mine"; a 409 on restore means the other
 * participant controls it, so it is remembered as "other". The chain is never touched.
 */
export function useSetVisibility(dotId: string) {
  const api = useApi();
  const qc = useQueryClient();
  const viewerId = useViewerId() ?? "unknown";
  const key = markKey(viewerId, dotId);
  const mark = useHiddenMark(key);

  const mutation = useMutation({
    mutationFn: async (hidden: boolean) => {
      if (env.demoFixtures) {
        setDemoHidden(dotId, hidden);
        return { id: dotId, hidden };
      }
      return api<{ id: string; hidden: boolean }>(`/v1/dots/${dotId}/visibility`, jsonBody({ hidden }, "PUT"));
    },
    onSuccess: ({ hidden }) => {
      setMark(key, hidden ? "me" : null);
      void qc.invalidateQueries({ queryKey: ["dots"] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) {
        setMark(key, "other");
        void qc.invalidateQueries({ queryKey: ["dots"] });
      }
    },
  });
  return { mark, mutation };
}
