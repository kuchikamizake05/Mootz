import type { ActiveFrame, FrameId, FramesResponse } from "./model";

/** Demo fixtures: First Meet is equipped. Progress follows the Dot count and 2 demo friends. */
export const demoActiveFrame: ActiveFrame = {
  kind: "achievement",
  id: "first_meet",
  name: "First Meet",
  assetKey: "achievement/first-meet",
  equippedAt: "2026-10-22T07:05:00Z",
};

const defs = [
  { id: "first_meet", name: "First Meet", assetKey: "achievement/first-meet", metric: "dotCount", target: 1 },
  { id: "together", name: "Together", assetKey: "achievement/together", metric: "dotCount", target: 10 },
  { id: "social_butterfly", name: "Social Butterfly", assetKey: "achievement/social-butterfly", metric: "distinctFriendPartners", target: 5 },
] as const;

export function demoFrames(dotCount: number): FramesResponse {
  const metrics = { dotCount, distinctFriendPartners: 2 };
  return {
    policy: { version: "demo-v1", status: "demo" },
    metrics,
    items: defs.map((d) => {
      const unlocked = metrics[d.metric] >= d.target;
      return {
        id: d.id,
        name: d.name,
        assetKey: d.assetKey,
        requirement: { metric: d.metric, target: d.target },
        progress: Math.min(metrics[d.metric], d.target),
        unlocked,
        unlockedAt: unlocked ? "2026-10-22T07:03:00Z" : null,
      };
    }),
  };
}

export function demoEquip(id: FrameId): ActiveFrame {
  const def = defs.find((x) => x.id === id)!;
  return { kind: "achievement", id, name: def.name, assetKey: def.assetKey, equippedAt: new Date().toISOString() };
}
