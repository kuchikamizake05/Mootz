"use client";

import { useRef } from "react";
import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsonBody } from "@/lib/api/client";
import { useApi, useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { DEMO_VIEWER, demoApi } from "./demo";
import type { ApiComment, Page, ReactionItem, SelfieItem, Thread } from "./model";
import { countComments } from "./model";

/** Viewer account ID (demo: fictional) and whether queries may run. */
export function useViewerId() {
  const profile = useProfile();
  return env.demoFixtures ? DEMO_VIEWER : profile.data?.id;
}

function usePageQuery(): { enabled: boolean } {
  const viewerId = useViewerId();
  return { enabled: env.demoFixtures || !!viewerId };
}

const q = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  return `?${search}`;
};

/** Comment list endpoint. `parentId` omitted lists roots; given lists replies of that root. */
function useListComments() {
  const api = useApi();
  return async (momentId: string, parentId: string | null, cursor: string | null, limit: number): Promise<Page<ApiComment>> => {
    if (env.demoFixtures) return demoApi.listComments(momentId, parentId);
    return api(`/v1/moments/${momentId}/comments${q({ limit: String(limit), cursor: cursor ?? undefined, parentId: parentId ?? undefined })}`);
  };
}

/**
 * Thread of a moment: roots (oldest first, paged) each with their replies. Replies are
 * fetched eagerly per loaded root because the API exposes no reply count. `count` covers
 * what is loaded; `hasMore` means more roots exist.
 */
export function useThread(momentId: string) {
  const list = useListComments();
  const { enabled } = usePageQuery();
  const roots = useInfiniteQuery({
    queryKey: ["social", "comments", momentId, "roots"],
    queryFn: ({ pageParam }) => list(momentId, null, pageParam, 20),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
  const rootItems = roots.data?.pages.flatMap((p) => p.items) ?? [];
  const replyQueries = useQueries({
    queries: rootItems.map((root) => ({
      queryKey: ["social", "comments", momentId, "replies", root.id],
      queryFn: async () => {
        // Replies are few; read every page (bounded) so counts and shape are exact.
        const all: ApiComment[] = [];
        let cursor: string | null = null;
        for (let i = 0; i < 10; i++) {
          const page: Page<ApiComment> = await list(momentId, root.id, cursor, 50);
          all.push(...page.items);
          if (!page.nextCursor) break;
          cursor = page.nextCursor;
        }
        return all;
      },
    })),
  });
  const threads: Thread[] = rootItems.map((root, i) => ({ root, replies: replyQueries[i]?.data ?? [] }));
  const repliesLoading = replyQueries.some((r) => r.isPending);
  const repliesError = replyQueries.some((r) => r.isError);
  return {
    threads,
    count: countComments(threads),
    isPending: roots.isPending,
    error: roots.error,
    hasMore: roots.hasNextPage,
    fetchMore: roots.fetchNextPage,
    fetchingMore: roots.isFetchingNextPage,
    repliesLoading,
    repliesError,
    refetch: () => {
      void roots.refetch();
      replyQueries.forEach((r) => void r.refetch());
    },
  };
}

/**
 * Send a comment or reply. A request key is created per (moment, body, parent) and reused
 * on retry until the send succeeds, so a retry never duplicates (API idempotency).
 */
export function useSendComment(momentId: string) {
  const api = useApi();
  const qc = useQueryClient();
  const key = useRef<{ sig: string; id: string } | null>(null);
  return useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: string }) => {
      if (env.demoFixtures) return demoApi.postComment(momentId, { body, parentId });
      const sig = JSON.stringify([body.trim(), parentId ?? null]);
      if (key.current?.sig !== sig) key.current = { sig, id: crypto.randomUUID() };
      return api<ApiComment>(`/v1/moments/${momentId}/comments`, jsonBody({ body, parentId, clientRequestId: key.current.id }));
    },
    onSuccess: () => {
      key.current = null;
      return qc.invalidateQueries({ queryKey: ["social", "comments", momentId] });
    },
  });
}

export function useDeleteComment(momentId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      if (env.demoFixtures) return demoApi.deleteComment(commentId);
      return api<void>(`/v1/moments/${momentId}/comments/${commentId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social", "comments", momentId] }),
  });
}

/** Reactions on a moment (newest first, bounded read). `mine` is the viewer's active one. */
export function useReactions(momentId: string) {
  const api = useApi();
  const viewerId = useViewerId();
  const { enabled } = usePageQuery();
  const query = useQuery({
    queryKey: ["social", "reactions", momentId],
    queryFn: async () => {
      if (env.demoFixtures) return demoApi.listReactions(momentId).items;
      const all: ReactionItem[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 5; i++) {
        const page: Page<ReactionItem> = await api(`/v1/moments/${momentId}/reactions${q({ limit: "50", cursor: cursor ?? undefined })}`);
        all.push(...page.items);
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }
      return all;
    },
    enabled,
  });
  const items = query.data ?? [];
  return { ...query, items, mine: items.find((r) => r.accountId === viewerId) ?? null, viewerId };
}

/** Private selfie library, newest first. Thumbnail URLs are short-lived, so refetch on mount. */
export function useSelfies() {
  const api = useApi();
  const { enabled } = usePageQuery();
  const query = useInfiniteQuery({
    queryKey: ["social", "selfies"],
    queryFn: ({ pageParam }): Promise<Page<SelfieItem>> =>
      env.demoFixtures ? Promise.resolve(demoApi.listSelfies()) : api(`/v1/me/selfies${q({ limit: "30", cursor: pageParam ?? undefined })}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
  return { ...query, items: query.data?.pages.flatMap((p) => p.items) ?? [] };
}

export function useReactionActions(momentId: string) {
  const api = useApi();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["social", "reactions", momentId] });

  const send = useMutation({
    mutationFn: async (selfieId: string) => {
      if (env.demoFixtures) return demoApi.putReaction(momentId, selfieId);
      await api(`/v1/moments/${momentId}/reaction`, jsonBody({ selfieId }, "PUT"));
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (env.demoFixtures) return demoApi.deleteReaction(momentId);
      await api<void>(`/v1/moments/${momentId}/reaction`, { method: "DELETE" });
    },
    onSuccess: refresh,
  });
  const upload = useMutation({
    mutationFn: async (blob: Blob): Promise<{ id: string }> => {
      if (env.demoFixtures) return demoApi.addSelfie(blob);
      return api<{ id: string }>("/v1/me/selfies", { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social", "selfies"] }),
  });
  const deleteSelfie = useMutation({
    mutationFn: async (id: string) => {
      if (env.demoFixtures) return demoApi.deleteSelfie(id);
      await api<void>(`/v1/me/selfies/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social", "selfies"] }),
  });
  return { send, remove, upload, deleteSelfie };
}
