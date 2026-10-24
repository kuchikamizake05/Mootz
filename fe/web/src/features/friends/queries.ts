"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsonBody } from "@/lib/api/client";
import { useApi, useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { DEMO_OWN_CODE, demoRelationships } from "./demo";
import type { FriendPage, Relationship } from "./model";

const listKey = ["friends", "list", env.demoFixtures ? "demo" : "me"];

/** Your own friend code (account ID). */
export function useOwnCode() {
  const profile = useProfile();
  return env.demoFixtures ? DEMO_OWN_CODE : profile.data?.id;
}

/** Friends and pending requests, following the cursor (pages of 50). */
export function useFriends() {
  const api = useApi();
  const { ready, authenticated } = usePrivy();
  return useQuery({
    queryKey: listKey,
    queryFn: async () => {
      if (env.demoFixtures) return demoRelationships;
      const items: Relationship[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 10; i++) {
        const params: URLSearchParams = new URLSearchParams({ limit: "50" });
        if (cursor) params.set("cursor", cursor);
        const page: FriendPage = await api<FriendPage>(`/v1/friends?${params}`);
        items.push(...page.items);
        cursor = page.nextCursor;
        if (!cursor) break;
      }
      return items;
    },
    enabled: env.demoFixtures || (ready && authenticated),
    staleTime: env.demoFixtures ? Infinity : 0,
  });
}

function useAfterChange() {
  const qc = useQueryClient();
  return (update: (items: Relationship[]) => Relationship[]) => {
    if (env.demoFixtures) qc.setQueryData<Relationship[]>(listKey, (old) => update(old ?? []));
    else {
      void qc.invalidateQueries({ queryKey: ["friends"] });
      // Accepting a friend can unlock Social Butterfly.
      void qc.invalidateQueries({ queryKey: ["frames"] });
    }
  };
}

/** Send a request by friend code. 404: unknown code. 409: they already requested you. */
export function useSendRequest() {
  const api = useApi();
  const after = useAfterChange();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const id = accountId.toLowerCase();
      if (env.demoFixtures) {
        const now = new Date().toISOString();
        return { accountId: id, status: "pending", direction: "outgoing", createdAt: now, updatedAt: now } as Relationship;
      }
      return api<Relationship>("/v1/friends/requests", jsonBody({ accountId: id }));
    },
    onSuccess: (rel) => after((items) => (items.some((r) => r.accountId === rel.accountId) ? items : [...items, rel])),
  });
}

/** Accept an incoming request, or decline / cancel / remove (DELETE is idempotent). */
export function useFriendAction() {
  const api = useApi();
  const after = useAfterChange();
  return useMutation({
    mutationFn: async (v: { kind: "accept" | "remove"; accountId: string }) => {
      if (env.demoFixtures) return v;
      if (v.kind === "accept") await api(`/v1/friends/${v.accountId}/accept`, jsonBody({}));
      else await api(`/v1/friends/${v.accountId}`, { method: "DELETE" });
      return v;
    },
    onSuccess: (v) =>
      after((items) =>
        v.kind === "remove"
          ? items.filter((r) => r.accountId !== v.accountId)
          : items.map((r) => (r.accountId === v.accountId ? { ...r, status: "accepted" as const } : r)),
      ),
  });
}
