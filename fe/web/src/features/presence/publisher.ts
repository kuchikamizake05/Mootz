import { PRESENCE_INTERVAL_MS } from "./model";
import type { components } from "@/lib/api/generated/presence";

export type PresenceStatus = "starting" | "sharing" | "denied" | "unavailable" | "paused" | "off";
export type PositionSample = components["schemas"]["PositionSample"];

/** No samples are queued: hidden pages and stopped publishers discard late GPS results. */
export function startPublisher(options: {
  geolocation: Pick<Geolocation, "getCurrentPosition">;
  visible: () => boolean;
  publish: (sample: PositionSample, signal: AbortSignal) => Promise<void>;
  onStatus: (status: PresenceStatus) => void;
}) {
  let stopped = false;
  let pending = false;
  let denied = false;
  const controller = new AbortController();
  const tick = () => {
    if (stopped || pending || denied || !options.visible()) return;
    pending = true;
    options.geolocation.getCurrentPosition(position => {
      if (stopped || !options.visible()) { pending = false; return; }
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || accuracy <= 0 || accuracy > 500 || Date.now() - position.timestamp > 30000) {
        pending = false;
        options.onStatus("unavailable");
        return;
      }
      void options.publish({ latitude, longitude, accuracyMeters: accuracy, capturedAtMs: position.timestamp }, controller.signal)
        .then(() => { if (!stopped) options.onStatus("sharing"); })
        .catch(() => { if (!stopped) options.onStatus("unavailable"); })
        .finally(() => { pending = false; });
    }, error => {
      pending = false;
      if (stopped) return;
      denied = error.code === 1;
      options.onStatus(denied ? "denied" : "unavailable");
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
  };
  options.onStatus("starting");
  tick();
  const interval = setInterval(tick, PRESENCE_INTERVAL_MS);
  return () => { stopped = true; clearInterval(interval); controller.abort(); };
}
