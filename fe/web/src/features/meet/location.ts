import type { LocationSample } from "./api";

export type LocationFailure = "denied" | "unavailable" | "timeout" | "unsupported";

/**
 * One foreground, high-accuracy position for the Meet distance check. Not cached
 * (maximumAge 0) because the backend rejects samples older than 15 s.
 */
export function getLocationSample(timeoutMs = 10000): Promise<LocationSample> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject("unsupported" satisfies LocationFailure);
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracyMeters: Math.max(p.coords.accuracy, 0.1),
          capturedAtMs: Math.round(p.timestamp),
        }),
      (e) =>
        reject((e.code === e.PERMISSION_DENIED ? "denied" : e.code === e.TIMEOUT ? "timeout" : "unavailable") satisfies LocationFailure),
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );
  });
}
