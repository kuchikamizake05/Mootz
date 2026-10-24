"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsonBody } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { useDotSummary } from "@/features/dots/queries";
import { demoActiveFrame, demoEquip, demoFrames } from "./demo";
import type { ActiveFrame, FrameId, FramesResponse } from "./model";

function useEnabled() {
  const { ready, authenticated } = usePrivy();
  return env.demoFixtures || (ready && authenticated);
}

/** Equipped frame (GET /v1/me/frame). A 503 means ownership couldn't be rechecked; keep the last known frame. */
export function useActiveFrame() {
  const api = useApi();
  const enabled = useEnabled();
  return useQuery({
    queryKey: ["frames", "active", env.demoFixtures ? "demo" : "me"],
    queryFn: async () => (env.demoFixtures ? demoActiveFrame : (await api<{ frame: ActiveFrame }>("/v1/me/frame")).frame),
    enabled,
    staleTime: env.demoFixtures ? Infinity : 0,
  });
}

/** Achievement frames with progress; computed locally from the Dot count in demo mode. */
export function useFrames() {
  const api = useApi();
  const enabled = useEnabled();
  const dots = useDotSummary();
  const query = useQuery({
    queryKey: ["frames", "list"],
    queryFn: () => api<FramesResponse>("/v1/me/frames"),
    enabled: enabled && !env.demoFixtures,
  });
  if (env.demoFixtures) return { data: demoFrames(dots.count ?? 0), isPending: false, error: null, refetch: async () => {} } as const;
  return { data: query.data, isPending: query.isPending, error: query.error, refetch: query.refetch } as const;
}

/** Wear or remove a frame. A failure leaves the cached (previous) frame untouched. */
export function useSetFrame() {
  const api = useApi();
  const qc = useQueryClient();
  const activeKey = ["frames", "active", env.demoFixtures ? "demo" : "me"];
  return useMutation({
    mutationFn: async (frameId: FrameId | null): Promise<ActiveFrame> => {
      if (env.demoFixtures) {
        return frameId ? demoEquip(frameId) : null;
      }
      if (!frameId) {
        await api("/v1/me/frame", { method: "DELETE" });
        return null;
      }
      return (await api<{ frame: ActiveFrame }>("/v1/me/frame", jsonBody({ frameId }, "PUT"))).frame;
    },
    onSuccess: (frame) => {
      qc.setQueryData(activeKey, frame);
      if (!env.demoFixtures) void qc.invalidateQueries({ queryKey: ["frames"] });
    },
  });
}
