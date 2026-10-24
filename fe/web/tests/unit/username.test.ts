import { describe, expect, it } from "vitest";
import { friendRef, handleLabel, normalizeUsername, parseFriendTarget, personName, safeNext, usernameProblem } from "@/features/profile/username";

describe("username validation", () => {
  it("normalises like the server, plus a leading @", () => {
    expect(normalizeUsername("  @Faaid_1 ")).toBe("faaid_1");
  });
  it("accepts 3 to 20 lowercase letters, digits and underscores", () => {
    for (const ok of ["abc", "a_b", "user_123", "a".repeat(20), "@Mixed_Case"]) expect(usernameProblem(ok)).toBeNull();
  });
  it("rejects empty, short, long and illegal characters", () => {
    expect(usernameProblem("")).toMatch(/enter/i);
    expect(usernameProblem("ab")).toMatch(/at least 3/);
    expect(usernameProblem("a".repeat(21))).toMatch(/at most 20/);
    for (const bad of ["has space", "dash-ed", "dot.ted", "émoji", "a@b"]) expect(usernameProblem(bad)).not.toBeNull();
  });
});

describe("display labels", () => {
  it("shows @handle or a neutral fallback, never an invented name", () => {
    expect(handleLabel("demo_a")).toBe("@demo_a");
    expect(handleLabel(null)).toBe("Friend");
    expect(handleLabel(undefined, "A friend")).toBe("A friend");
    expect(friendRef("demo_a")).toBe("@demo_a");
    expect(friendRef(null)).toBe("your friend");
  });
  it("labels the viewer as You regardless of username", () => {
    expect(personName({ id: "me", username: "faaid", viewerId: "me" })).toBe("You");
    expect(personName({ id: "x", username: "demo_b", viewerId: "me" })).toBe("@demo_b");
    expect(personName({ id: "x", username: null, viewerId: "me" })).toBe("Friend");
    expect(personName({ id: "x", username: null, viewerId: undefined, fallback: "A friend" })).toBe("A friend");
  });
});

describe("friend target", () => {
  const uuid = "00000000-0000-4000-8000-0000000000B1";
  it("sends a username, stripping @ and case", () => {
    expect(parseFriendTarget(" @Demo_A ")).toEqual({ username: "demo_a" });
  });
  it("falls back to accountId for a UUID", () => {
    expect(parseFriendTarget(uuid)).toEqual({ accountId: uuid.toLowerCase() });
  });
  it("rejects anything else", () => {
    expect(parseFriendTarget("")).toBeNull();
    expect(parseFriendTarget("no way")).toBeNull();
  });
});

describe("safeNext", () => {
  it("keeps same-origin paths only", () => {
    expect(safeNext("/feed?filter=events")).toBe("/feed?filter=events");
    for (const bad of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "feed", "/a\nb"]) expect(safeNext(bad)).toBe("/profile");
    expect(safeNext("javascript:alert(1)", "/map")).toBe("/map");
  });
});
