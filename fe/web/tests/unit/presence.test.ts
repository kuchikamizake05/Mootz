import { afterEach, expect, it, vi } from "vitest";
import { freshLocations, PRESENCE_INTERVAL_MS } from "../../src/features/presence/model";
import { startPublisher } from "../../src/features/presence/publisher";

afterEach(() => vi.useRealTimers());
it("removes expired markers at the exact expiry boundary", () => {
  const item = { accountId: "a", displayName: null, latitude: 0, longitude: 0, updatedAt: new Date(0).toISOString(), expiresAt: new Date(60000).toISOString() };
  expect(freshLocations([item], 59999)).toHaveLength(1);
  expect(freshLocations([item], 60000)).toEqual([]);
});
it("samples every five seconds and never publishes a late GPS result after stopping", async () => {
  vi.useFakeTimers();
  let callback: PositionCallback = () => {};
  const getCurrentPosition = vi.fn((success: PositionCallback) => { callback = success; });
  const publish = vi.fn(async () => {});
  const stop = startPublisher({ geolocation: { getCurrentPosition }, visible: () => true, publish, onStatus: vi.fn() });
  const position = () => ({ coords: { latitude: 1, longitude: 2, accuracy: 10 }, timestamp: Date.now() }) as GeolocationPosition;
  callback(position());
  await vi.advanceTimersByTimeAsync(PRESENCE_INTERVAL_MS);
  expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  stop();
  callback(position());
  await vi.advanceTimersByTimeAsync(15000);
  expect(publish).toHaveBeenCalledTimes(1);
});
it("does not sample hidden pages or repeatedly prompt after permission denial", async () => {
  vi.useFakeTimers();
  let visible = false;
  const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback | null) => error?.({ code: 1 } as GeolocationPositionError));
  const publish = vi.fn(async () => {});
  const stop = startPublisher({ geolocation: { getCurrentPosition }, visible: () => visible, publish, onStatus: vi.fn() });
  expect(getCurrentPosition).not.toHaveBeenCalled();
  visible = true;
  await vi.advanceTimersByTimeAsync(20000);
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(publish).not.toHaveBeenCalled();
  stop();
});
