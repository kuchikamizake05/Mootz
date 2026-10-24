import type { ComponentProps } from "react";
import { CalendarDays, Camera, ChevronDown, ScanLine, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonProps = Omit<ComponentProps<"button">, "children">;

/** 80px camera entry. Icon only; accessible name "Post moment". Opens the capture flow. */
export function PostMomentButton({ className, size = 80, ...props }: ButtonProps & { size?: 64 | 80 }) {
  return (
    <button
      type="button"
      aria-label="Post moment"
      title="Post moment"
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full border-[3px] border-white bg-mootz-deep text-white",
        "shadow-[0_6px_0_var(--color-mootz-depth),inset_0_1px_0_#ffffff66] transition-transform active:translate-y-1.5 active:shadow-none",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <Camera aria-hidden size={size === 80 ? 34 : 28} strokeWidth={2} />
    </button>
  );
}

/** Compact raised chip, e.g. "Events" (44px) on the Map header. */
export function ControlChip({
  icon: Icon,
  label,
  className,
  ...props
}: { icon: LucideIcon; label: string } & ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "raised inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-mootz-surface px-3 text-sm font-extrabold text-mootz-deep",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden size={19} strokeWidth={2.25} />
      {label}
    </button>
  );
}

/** Your Dots entry. Dots count Meets — never a balance or currency. */
export function DotsCountChip({ count, className, ...props }: { count: number } & ButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Your Dots: ${count} ${count === 1 ? "Meet" : "Meets"}`}
      className={cn(
        "raised-strong inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-mootz-purple px-3.5 text-sm font-extrabold text-white",
        className,
      )}
      {...props}
    >
      {count} {count === 1 ? "Dot" : "Dots"}
      <span aria-hidden className="size-2.5 rounded-full bg-white" />
    </button>
  );
}

export type MomentFilter = "all" | "friends" | "events";
const filterLabel: Record<MomentFilter, string> = { all: "All", friends: "Friends", events: "Events" };

/** Opens the All / Friends / Events picker. The same filter applies to Map and Feed. */
export function FilterChip({ value, className, ...props }: { value: MomentFilter } & Omit<ButtonProps, "value">) {
  return (
    <button
      type="button"
      aria-label={`Filter moments: ${filterLabel[value]}`}
      aria-haspopup="dialog"
      className={cn(
        "raised inline-flex min-h-11 items-center gap-2 rounded-[18px] bg-mootz-surface px-3 text-[13px] font-extrabold text-mootz-deep",
        className,
      )}
      {...props}
    >
      <SlidersHorizontal aria-hidden size={16} strokeWidth={2.25} />
      <span className="min-w-8 text-left">{filterLabel[value]}</span>
      <ChevronDown aria-hidden size={16} strokeWidth={2.25} className="-ml-1" />
    </button>
  );
}

/** Stacked icon + label tile used in the bottom action row (60px tall). */
function ActionTile({
  icon: Icon,
  label,
  tone,
  className,
  ...props
}: { icon: LucideIcon; label: string; tone: "raised" | "quiet" } & ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-[60px] flex-col items-center justify-center gap-1 rounded-[22px] bg-mootz-surface p-2 font-extrabold text-mootz-deep",
        tone === "raised" ? "raised text-[13px]" : "raised text-[11px]",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden size={20} strokeWidth={2.25} />
      {label}
    </button>
  );
}

/**
 * Events · Camera · Scan to Meet. Shared by Map and Feed (A.01). Scan to Meet is
 * phone-camera first; it is not the Your Dots entry.
 */
export function BottomActions({
  onEvents,
  onPost,
  onScan,
  className,
}: {
  onEvents?: () => void;
  onPost?: () => void;
  onScan?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex w-[302px] items-end gap-2", className)}>
      <ActionTile icon={CalendarDays} label="Events" tone="raised" className="flex-1" onClick={onEvents} />
      <PostMomentButton onClick={onPost} />
      <ActionTile icon={ScanLine} label="Scan to Meet" tone="quiet" className="w-[98px]" onClick={onScan} />
    </div>
  );
}
