import { cn } from "@/lib/cn";
import { Photo } from "./photo";

/**
 * Equipped frame, shown identically on Map, Feed, comments, Dot detail and profile (A.05).
 * - lilac: default round gradient ring
 * - event: squared deep-purple ring (event collectible, A.03)
 * - achievement: round deep-purple ring (e.g. First Meet, A.03)
 * A frame is never a selection indicator; selection uses the separate blue ring.
 */
export type AvatarFrame = "none" | "lilac" | "event" | "achievement";

const frameClass: Record<AvatarFrame, string> = {
  none: "rounded-full",
  lilac:
    "rounded-full border-[3px] border-white bg-[linear-gradient(140deg,var(--color-mootz-lilac)_0%,var(--color-mootz-purple)_50%,var(--color-mootz-violet)_100%)]",
  event: "rounded-[32%] border-[3px] border-mootz-purple bg-mootz-deep",
  achievement: "rounded-full border-[3px] border-mootz-purple bg-mootz-deep",
};

export function Avatar({
  src,
  name,
  size = 52,
  frame = "lilac",
  selected = false,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  frame?: AvatarFrame;
  selected?: boolean;
  className?: string;
}) {
  // Inner padding follows the source specimens: 4px at 52px, ~5–6px for deep frames at 56px.
  const pad = frame === "none" ? 0 : Math.max(2, Math.round(size * (frame === "lilac" ? 0.077 : 0.1)));
  const initials = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        frameClass[frame],
        selected && "outline-3 outline-offset-2 outline-mootz-select",
        className,
      )}
      style={{ width: size, height: size, padding: pad }}
    >
      {src ? (
        <Photo src={src} alt={name} className={cn("size-full", frame === "event" ? "rounded-[24%]" : "rounded-full")} />
      ) : (
        <span
          aria-label={name}
          role="img"
          className={cn(
            "grid size-full place-items-center bg-mootz-lilac font-black text-mootz-deep",
            frame === "event" ? "rounded-[24%]" : "rounded-full",
          )}
          style={{ fontSize: size * 0.42 }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
