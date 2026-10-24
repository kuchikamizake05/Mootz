"use client";

import { useSyncExternalStore } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { useMeetWallet } from "@/features/wallet/use-meet-wallet";
import { demoStreak } from "./demo";
import { jakartaDay, type Streak } from "./model";

const subscribe = (notify: () => void) => {
  const timer = setInterval(notify, 60_000);
  return () => clearInterval(timer);
};

/** Today in WIB as an external store; null during SSR/hydration. */
export function useJakartaToday() {
  return useSyncExternalStore(subscribe, () => jakartaDay(new Date()), () => null);
}

export function useStreak() {
  const api = useApi();
  const { ready, authenticated } = usePrivy();
  return useQuery({
    queryKey: ["profile", "streak", env.demoFixtures ? "demo" : "me"],
    queryFn: () => (env.demoFixtures ? Promise.resolve(demoStreak()) : api<Streak>("/v1/me/streak")),
    enabled: env.demoFixtures || (ready && authenticated),
    staleTime: env.demoFixtures ? Infinity : 0,
  });
}

/** "Save my Meets onchain" preference. Applies to future Meets only. */
export function useRecordMeet() {
  const profile = useProfile();
  const { setRecordMeet } = useMeetWallet();
  const qc = useQueryClient();
  const demo = useQuery({
    queryKey: ["profile", "demoRecordMeet"],
    queryFn: () => true,
    staleTime: Infinity,
    enabled: env.demoFixtures,
  });
  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (env.demoFixtures) {
        qc.setQueryData(["profile", "demoRecordMeet"], next);
        return next;
      }
      return (await setRecordMeet(next)).recordMeet;
    },
    onSuccess: () => {
      if (!env.demoFixtures) void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const value = env.demoFixtures ? demo.data : profile.data?.recordMeet;
  return { value, isPending: env.demoFixtures ? demo.isPending : profile.isPending, loadError: profile.error, mutation, refetch: profile.refetch };
}
