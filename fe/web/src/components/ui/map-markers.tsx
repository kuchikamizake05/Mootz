import type { ComponentProps } from "react";
import { CalendarDays, Images, LockKeyhole, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, type AvatarFrame } from "./avatar";
import { Photo } from "./photo";

/*
 * Map overlays (A.01, A.03, A.05). These render inside MapLibre markers, so each is a
 * fixed-size box anchored at its centre. Moments, Dot areas, event venues and your own
 * location are visually distinct and never imply a friend's live position.
 */

type MarkerButton = Omit<ComponentProps<"button">, "children"> & { selected?: boolean };

const selectedRing = "outline-3 outline-offset-4 outline-mootz-select";

/** Avatar-only moment marker at a shared posting location (64×68). */
export function AvatarMomentMarker({
  author,
  avatarSrc,
  frame = "lilac",
  photoSrc,
  selected,
  className,
  ...props
}: MarkerButton & { author: string; avatarSrc?: string | null; frame?: AvatarFrame; photoSrc?: string | null }) {
  void photoSrc;
  return (
    <button
      type="button"
      aria-label={`Moment by ${author}`}
      aria-pressed={selected}
      className={cn("relative h-[68px] w-16 rounded-full", selected && selectedRing, className)}
      {...props}
    >
      <Avatar src={avatarSrc} name={author} size={56} frame={frame} className="absolute left-[3px] top-0 shadow-float" />
    </button>
  );
}

/** Photo-led moment: back photo thumbnail with the author avatar in the corner (84×90). */
export function PhotoMomentMarker({
  author,
  avatarSrc,
  frame = "lilac",
  photoSrc,
  selected,
  className,
  ...props
}: MarkerButton & { author: string; avatarSrc?: string | null; frame?: AvatarFrame; photoSrc?: string | null }) {
  return (
    <button
      type="button"
      aria-label={`Moment by ${author}`}
      aria-pressed={selected}
      className={cn("relative h-[90px] w-[84px] rounded-[22px]", selected && selectedRing, className)}
      {...props}
    >
      <Photo src={photoSrc} alt="" className="absolute left-0 top-0 size-[76px] rounded-[20px] border-4 border-white shadow-float" />
      <Avatar src={avatarSrc} name={author} size={34} frame={frame} className="absolute left-12 top-[53px]" />
    </button>
  );
}

/** Several moments at one spot (64px). */
export function ClusterMarker({ count, className, ...props }: Omit<ComponentProps<"button">, "children"> & { count: number }) {
  return (
    <button
      type="button"
      aria-label={`${count} moments here`}
      className={cn(
        "inline-flex size-16 items-center justify-center gap-1 rounded-full border-4 border-white bg-mootz-deep text-[22px] font-black text-white shadow-float",
        className,
      )}
      {...props}
    >
      <Images aria-hidden size={20} strokeWidth={2.25} />
      {count}
    </button>
  );
}

/** Event venue — a place, not a participant location. */
export function EventVenueMarker({
  place,
  name,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { place: string; name: string }) {
  return (
    <button
      type="button"
      aria-label={`${name} at ${place}`}
      className={cn(
        "inline-flex h-[68px] items-center gap-2.5 rounded-[22px] border-[3px] border-white bg-mootz-deep p-3 text-left text-sm font-bold leading-[1.2] text-white shadow-[0_5px_14px_#35116f26]",
        className,
      )}
      {...props}
    >
      <CalendarDays aria-hidden size={26} strokeWidth={2} className="shrink-0" />
      <span>
        {place}
        <br />
        {name}
      </span>
    </button>
  );
}

/**
 * Meet Dot on the map: a soft ~200 m approximate area with a compact glyph.
 * The lock appears only after a confirmed onchain recording.
 */
export function MeetDotMarker({
  savedOnchain,
  size = 144,
  label,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { savedOnchain: boolean; size?: number; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "relative grid place-items-center rounded-full border border-mootz-light/40 bg-mootz-light/20",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <span className="grid size-9 place-items-center rounded-full border-[3px] border-white bg-mootz-purple text-white"><Users aria-hidden size={22} strokeWidth={2.75} /></span>
      {savedOnchain && (
        <LockKeyhole
          aria-hidden
          size={13}
          strokeWidth={2.5}
          className="absolute rounded-sm bg-white text-mootz-deep"
          style={{ left: size / 2 + 7, top: size / 2 + 5 }}
        />
      )}
    </button>
  );
}

/** Your own position after Locate me: a small distinct dot, never an avatar. */
export function YourLocationDot({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Your location" className={cn("relative grid size-8 place-items-center", className)}>
      <span className="absolute inset-0 rounded-full bg-mootz-deep/15" />
      <span className="size-3.5 rounded-full border-[3px] border-white bg-mootz-deep shadow-soft" />
    </span>
  );
}
