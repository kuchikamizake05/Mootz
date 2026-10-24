"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useProfile } from "@/lib/api/use-api";
import { jsonBody } from "@/lib/api/client";
import { env } from "@/lib/env";
import { PRESENCE_INTERVAL_MS, type LocationSharing } from "./model";
import { startPublisher, type PresenceStatus } from "./publisher";

const PresenceContext = createContext<PresenceStatus>("off");
export const usePresenceStatus = () => useContext(PresenceContext);

export function useLocationSharing() {
  const api = useApi();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const queryKey = ["location-sharing", profile.data?.id];
  const query = useQuery({
    queryKey,
    queryFn: () => api<LocationSharing>("/v1/me/location-sharing"),
    enabled: !env.demoFixtures && !!profile.data,
    refetchInterval: PRESENCE_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => api<LocationSharing>("/v1/me/location-sharing", jsonBody({ enabled }, "PUT")),
    onSuccess: value => { queryClient.setQueryData(queryKey, value); },
  });
  return { query, mutation };
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const profile = useProfile();
  const { query } = useLocationSharing();
  const [status, setStatus] = useState<PresenceStatus>("off");
  const enabled = !env.demoFixtures && !!profile.data && query.data?.enabled === true && !query.isError;

  useEffect(() => {
    if (!enabled) return;
    let stop: (() => void) | undefined;
    const remove = () => { void api("/v1/me/location", { method: "DELETE", keepalive: true }).catch(() => {}); };
    const resume = () => {
      stop?.();
      stop = undefined;
      if (document.visibilityState !== "visible") {
        setStatus("paused");
        remove();
        return;
      }
      if (!navigator.geolocation) { setStatus("unavailable"); return; }
      stop = startPublisher({
        geolocation: navigator.geolocation,
        visible: () => document.visibilityState === "visible",
        publish: (sample, signal) => api<void>("/v1/me/location", { ...jsonBody(sample, "PUT"), signal }),
        onStatus: setStatus,
      });
    };
    const hide = () => { stop?.(); stop = undefined; remove(); };
    resume();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pagehide", hide);
    return () => {
      stop?.();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pagehide", hide);
      remove();
    };
  }, [api, enabled, profile.data?.id]);

  const displayedStatus = env.demoFixtures ? "off" : query.isError ? "unavailable" : !query.data ? "starting" : enabled ? status : "off";
  return <PresenceContext value={displayedStatus}>{children}</PresenceContext>;
}

export const presenceCopy: Record<PresenceStatus, string> = {
  starting: "Finding your location…",
  sharing: "Sharing your approximate location with friends · every 5s",
  denied: "Location permission is off. Allow it in browser settings to share.",
  unavailable: "Location could not update. Your last position expires within 60s.",
  paused: "Sharing paused while the app is hidden.",
  off: "Location sharing is off.",
};
