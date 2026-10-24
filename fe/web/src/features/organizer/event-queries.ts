"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsonBody } from "@/lib/api/client";
import { useApi, useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import type { components } from "@/lib/api/generated/events";

export type CreateEvent = components["schemas"]["CreateEvent"];
export type OrganizerEvent = components["schemas"]["OrganizerEvent"];
type EventPage = { items: OrganizerEvent[]; nextCursor: string | null };

export function useOrganizerAccess() {
  const api = useApi();
  const profile = useProfile();
  const access = useQuery({
    queryKey: ["organizer", profile.data?.id, "access"],
    enabled: !env.demoFixtures && profile.isSuccess,
    queryFn: () => api<{ enabled: boolean }>("/v1/me/organizer"),
  });
  return { profile, access };
}

export function useOrganizerEvents() {
  const api = useApi();
  const { profile, access } = useOrganizerAccess();
  return useInfiniteQuery({
    queryKey: ["organizer", profile.data?.id, "events"],
    enabled: access.data?.enabled === true,
    initialPageParam: null as string | null,
    getNextPageParam: (page: EventPage) => page.nextCursor,
    queryFn: ({ pageParam }) => api<EventPage>("/v1/me/events?limit=20" + (pageParam ? "&cursor=" + encodeURIComponent(pageParam) : "")),
  });
}

export function useCreateEvent() {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEvent) => api<components["schemas"]["Event"]>("/v1/events", jsonBody(input)),
    onSuccess: async () => {
      await Promise.all([cache.invalidateQueries({ queryKey: ["organizer"] }), cache.invalidateQueries({ queryKey: ["events"] })]);
    },
  });
}

export function useRecordAttendance(id: string) {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => api<{ checkedIn: boolean; checkedInAt: string }>(`/v1/events/${id}/check-ins`, jsonBody({ accountId })),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["organizer"] }),
  });
}
