import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle, LockKeyhole, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Photo } from "./photo";

/**
 * Onchain recording status of a Dot (A.05). The Dot itself already exists once the
 * backend accepted the Meet; this only reports the optional MeetRegistry record.
 * "saved" may be shown only after a receipt and contract readback.
 */
export type RecordingStatus = "saved" | "pending" | "failed" | "off";

export function RecordingStatusRow({
  status,
  onRetry,
  className,
}: {
  status: RecordingStatus;
  onRetry?: () => void;
  className?: string;
}) {
  const base = "flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm text-mootz-deep";
  if (status === "saved") {
    return (
      <p className={cn(base, "bg-mootz-lilac", className)}>
        <LockKeyhole aria-hidden size={18} strokeWidth={2.25} />
        Saved onchain
      </p>
    );
  }
  if (status === "pending") {
    return (
      <p className={cn(base, "bg-mootz-surface", className)} aria-live="polite">
        <LoaderCircle aria-hidden size={18} className="animate-spin" />
        Saving onchain…
      </p>
    );
  }
  if (status === "failed") {
    return (
      <p className={cn(base, "justify-between bg-mootz-surface", className)}>
        Couldn&apos;t save onchain.
        {onRetry && (
          <button type="button" onClick={onRetry} className="min-h-11 px-2 font-extrabold underline">
            Retry
          </button>
        )}
      </p>
    );
  }
  return <p className={cn(base, "bg-mootz-surface", className)}>Not saved onchain</p>;
}

/**
 * Empty / loading / error message from the B.01 state library. Recovery stays local:
 * keep the shell, map position and Feed scroll around it.
 */
export function StateMessage({
  icon: Icon,
  title,
  children,
  actions,
  busy,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div role={busy ? "status" : undefined} aria-live={busy ? "polite" : undefined} className={cn("flex flex-col items-start gap-2", className)}>
      <Icon aria-hidden size={32} strokeWidth={2} className={cn("text-mootz-deep", busy && "animate-spin")} />
      <h2 className="mt-2 font-display text-[28px] leading-tight text-mootz-ink">{title}</h2>
      {children && <div className="text-sm text-mootz-muted">{children}</div>}
      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Reusable private selfie in the reaction library (A.04 / M09). */
export function SelfieTile({
  src,
  label,
  selected,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { src?: string | null; label: string; selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? `${label}, selected` : label}
      className={cn(
        "relative h-32 overflow-hidden rounded-[20px]",
        selected ? "border-[3px] border-mootz-deep" : "border border-mootz-hairline",
        className,
      )}
      {...props}
    >
      <Photo src={src} alt="" className="absolute inset-0" />
      <span className="absolute bottom-2 left-2 flex flex-col items-start rounded-[7px] bg-mootz-ink/80 px-1.5 py-1 text-[11px] font-bold leading-tight text-white">
        {label}
        {selected && <span>Selected</span>}
      </span>
    </button>
  );
}
