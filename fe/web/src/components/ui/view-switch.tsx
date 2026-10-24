import Link from "next/link";
import { Images, Map } from "lucide-react";
import { cn } from "@/lib/cn";

export type View = "map" | "feed";

/**
 * Map | Feed — the only two primary destinations. Each half is a ≥44px target;
 * the active thumb sits under the current view. Navigation must preserve the
 * other view's position, filter and panel state (handled by the shell).
 */
export function ViewSwitch({
  active,
  hrefs = { map: "/map", feed: "/feed" },
  className,
}: {
  active: View;
  hrefs?: Record<View, string>;
  className?: string;
}) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "relative inline-grid h-[52px] w-[184px] shrink-0 grid-cols-2 rounded-[28px] border border-b-2 border-mootz-depth bg-mootz-lilac p-[3px] shadow-[0_3px_0_var(--color-mootz-depth),inset_0_1px_0_#ffffff66]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-[3px] top-[3px] h-11 w-[88px] rounded-3xl bg-mootz-deep transition-transform duration-200 ease-out motion-reduce:transition-none",
          active === "feed" ? "translate-x-[88px]" : "translate-x-0",
        )}
      />
      {(["map", "feed"] as const).map((view) => (
        <Link
          key={view}
          href={hrefs[view]}
          aria-current={active === view ? "page" : undefined}
          className={cn(
            "relative z-10 flex h-11 items-center justify-center gap-1.5 rounded-3xl text-sm font-extrabold",
            active === view ? "text-white" : "text-mootz-deep",
          )}
        >
          {view === "map" ? <Map aria-hidden size={16} /> : <Images aria-hidden size={16} />}
          {view === "map" ? "Map" : "Feed"}
        </Link>
      ))}
    </nav>
  );
}
