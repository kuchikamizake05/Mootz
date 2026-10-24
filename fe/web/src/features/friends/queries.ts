"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, jsonBody } from "@/lib/api/client";
import { useApi, useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { DEMO_KNOWN_USERNAMES, DEMO_OWN_CODE, DEMO_OWN_USERNAME, demoRelationships } from "./demo";
import type { FriendTarget } from "@/features/profile/username";
import type { FriendPage, Relationship } from "./model";

const listKey = ["friends", "list", env.demoFixtures ? "demo" : "me"];

/** Your own friend code (account ID), kept as a fallback to your @username. */
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

/** Send a request by @username or, as a fallback, account code. 404: unknown. 400: yourself. 409: they already requested you. */
export function useSendRequest() {
  const api = useApi();
  const after = useAfterChange();
  return useMutation({
    mutationFn: async (target: FriendTarget) => {
      if (env.demoFixtures) {
        const now = new Date().toISOString();
        const username = "username" in target ? target.username : null;
        if (username === DEMO_OWN_USERNAME) throw new ApiError(400, "SELF_REQUEST", null);
        if (username && !DEMO_KNOWN_USERNAMES.includes(username)) throw new ApiError(404, "NOT_FOUND", null);
        // Stable fake ID per handle so a repeat request isn't listed twice.
        const accountId = "accountId" in target ? target.accountId : `00000000-0000-4000-8000-${[...username!].map((c) => c.charCodeAt(0).toString(16)).join("").padEnd(12, "0").slice(0, 12)}`;
        return { accountId, username, status: "pending", direction: "outgoing", createdAt: now, updatedAt: now } as Relationship;
      }
      return api<Relationship>("/v1/friends/requests", jsonBody(target));
    },
    onSuccess: (rel) => after((items) => (items.some((r) => r.accountId === rel.accountId || (!!rel.username && r.username === rel.username)) ? items : [...items, rel])),
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
