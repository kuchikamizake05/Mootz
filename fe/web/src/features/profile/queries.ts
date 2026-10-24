"use client";

import { useSyncExternalStore } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, jsonBody } from "@/lib/api/client";
import { useApi, useProfile, type Profile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { useMeetWallet } from "@/features/wallet/use-meet-wallet";
import { DEMO_TAKEN_USERNAMES, demoStreak, demoViewerUsername } from "./demo";
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

const demoUsernameKey = ["profile", "demoUsername"];

/** Own username: undefined while loading, null when none is chosen. */
export function useOwnUsername(): string | null | undefined {
  const profile = useProfile();
  const demo = useQuery({ queryKey: demoUsernameKey, queryFn: () => demoViewerUsername as string | null, staleTime: Infinity, enabled: env.demoFixtures });
  return env.demoFixtures ? demo.data : profile.data?.username;
}

/** PUT /v1/me/username. 400 INVALID_USERNAME, 409 USERNAME_TAKEN. The returned Profile replaces the ["me"] cache. */
export function useSetUsername() {
  const api = useApi();
  const qc = useQueryClient();
  const { user } = usePrivy();
  return useMutation({
    mutationFn: async (username: string) => {
      if (env.demoFixtures) {
        if (DEMO_TAKEN_USERNAMES.includes(username)) throw new ApiError(409, "USERNAME_TAKEN", null);
        qc.setQueryData(demoUsernameKey, username);
        return null;
      }
      return api<Profile>("/v1/me/username", jsonBody({ username }, "PUT"));
    },
    onSuccess: (profile) => {
      if (profile) qc.setQueryData(["me", user?.id], profile);
    },
  });
}
