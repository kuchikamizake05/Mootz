import { describe, expect, it } from "vitest";
import { buildChallenge, classify, newNonce, parseCollectionId } from "@/features/organizer/logic";

const eventId = `0x${"ab".repeat(32)}` as const;

describe("organizer logic", () => {
  it("parses collection ids", () => {
    expect(parseCollectionId(undefined)).toBe(1n);
    expect(parseCollectionId("7")).toBe(7n);
    for (const bad of ["0", "-1", "1.5", "abc", "", ["1", "2"]]) expect(parseCollectionId(bad)).toBeNull();
  });
  it("classifies holder, nonholder with meets, and missing collection", () => {
    expect(classify(eventId, 1n, 2n).kind).toBe("alumni");
    expect(classify(eventId, 0n, 3n)).toMatchObject({ kind: "nonholder", meetCount: 3n });
    expect(classify(`0x${"0".repeat(64)}`, 0n, 0n).kind).toBe("missing-collection");
  });
  it("builds challenges with a fresh nonce each time", () => {
    const a = newNonce();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newNonce()).not.toBe(a);
    const msg = buildChallenge("0x0000000000000000000000000000000000000001", a, new Date(0));
    expect(msg).toContain(`Nonce: ${a}`);
    expect(msg).toContain("1970-01-01T00:00:00.000Z");
  });
});
