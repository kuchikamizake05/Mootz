import { describe, expect, it, vi } from "vitest";
import { loadMomentPhotos } from "@/features/moments/photos";

describe("full-size private moment photos", () => {
  it("requests both originals through the authorized media API and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    const request = vi.fn(async (path: string, init?: RequestInit) => {
      expect(init?.signal).toBe(signal);
      return { url: `https://private.example${path}?signed=short-lived`, expiresIn: 60 };
    });
    const api = <T>(path: string, init?: RequestInit) => request(path, init) as Promise<T>;
    const images = await loadMomentPhotos(api, "moment-id", signal);
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      "/v1/moments/moment-id/media/back", "/v1/moments/moment-id/media/front",
    ]);
    expect(images.back).toContain("/media/back?signed=");
    expect(images.front).toContain("/media/front?signed=");
    for (const call of request.mock.calls) expect(call[1]).toEqual({ signal });
  });

  it("propagates denied access rather than inventing a public image URL", async () => {
    const denied = new Error("404 outside audience");
    const api = async <T,>(): Promise<T> => { throw denied; };
    await expect(loadMomentPhotos(api, "private-moment")).rejects.toBe(denied);
  });
});
