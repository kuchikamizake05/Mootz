import type { AvatarFrame } from "@/components/ui/avatar";
import type { components } from "@/lib/api/generated/frames";

export type ActiveFrame = components["schemas"]["FrameResponse"]["frame"];
export type FrameId = "first_meet" | "together" | "social_butterfly";

export type FrameItem = {
  id: FrameId;
  name: string;
  assetKey: string;
  requirement: { metric: "dotCount" | "distinctFriendPartners"; target: number };
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
};
export type FramesResponse = { policy: { version: string; status: string }; metrics: { dotCount: number; distinctFriendPartners: number }; items: FrameItem[] };

/** achievement -> deep round ring, event -> squared ring, none -> default lilac ring. */
export function avatarFrame(frame: ActiveFrame | undefined): AvatarFrame {
  if (!frame) return "lilac";
  return frame.kind === "achievement" ? "achievement" : "event";
}

export const frameName = (frame: ActiveFrame | undefined) => (frame ? (frame.kind === "achievement" ? frame.name : frame.displayName) : null);

export function requirementLabel(item: FrameItem) {
  const { metric, target } = item.requirement;
  const unit = metric === "dotCount" ? (target === 1 ? "Dot" : "Dots") : target === 1 ? "different friend" : "different friends";
  if (item.unlocked) return `${target} ${unit} · Unlocked`;
  return `${item.progress} of ${target} ${unit}`;
}
