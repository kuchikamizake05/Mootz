"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useApi, useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { demoMoments } from "./demo";
import { toMomentCard, type ApiMoment, type MomentCard, type MomentFilter } from "./model";

type Page = { items: ApiMoment[]; nextCursor: string | null };

/**
 * Authorized moments for Feed (`/v1/feed`) or Map (`/v1/map`, located items only).
 * Both share IDs, so a selection carries across views.
 */
export function useMoments(kind: "feed" | "map", filter: MomentFilter) {
  const api = useApi();
  const { ready, authenticated } = usePrivy();
  const profile = useProfile();
  const viewerId = profile.data?.id;

  const query = useInfiniteQuery({
    queryKey: ["moments", kind, filter, viewerId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ filter, limit: "20" });
      if (pageParam) params.set("cursor", pageParam);
      return api<Page>(`/v1/${kind}?${params}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !env.demoFixtures && ready && authenticated && !!viewerId,
  });

  if (env.demoFixtures) {
    const items = demoMoments.filter(
      (m) => (kind === "map" ? m.location : true) && (filter === "friends" ? !m.own : filter === "events" ? m.eventId : true),
    );
    return { items, isPending: false, error: null, hasNextPage: false, fetchNextPage: async () => {}, refetch: async () => {} } as const;
  }

  const items: MomentCard[] = query.data?.pages.flatMap((p) => p.items.map((m) => toMomentCard(m, viewerId))) ?? [];
  return {
    items,
    isPending: query.isPending || profile.isPending,
    error: query.error ?? profile.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  } as const;
}

/** One authorized moment (sheet / detail). 404 means absent or outside audience. */
export function useMoment(id: string | null) {
  const api = useApi();
  const profile = useProfile();
  return useQuery({
    queryKey: ["moment", id, profile.data?.id],
    queryFn: async () => toMomentCard(await api<ApiMoment>(`/v1/moments/${id}`), profile.data?.id),
    enabled: !env.demoFixtures && !!id && !!profile.data,
    initialData: env.demoFixtures ? demoMoments.find((m) => m.id === id) : undefined,
  });
}
