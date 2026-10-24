import Link from "next/link";
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
        "relative inline-grid h-[52px] w-[184px] grid-cols-2 rounded-[28px] border border-mootz-hairline bg-mootz-lilac p-[3px] shadow-soft",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[3px] h-11 w-[88px] rounded-3xl bg-mootz-deep transition-transform duration-200 ease-out",
          active === "feed" ? "translate-x-[88px]" : "translate-x-0",
        )}
      />
      {(["map", "feed"] as const).map((view) => (
        <Link
          key={view}
          href={hrefs[view]}
          aria-current={active === view ? "page" : undefined}
          className={cn(
            "relative z-10 grid h-11 place-items-center rounded-3xl text-sm font-extrabold",
            active === view ? "text-white" : "text-mootz-deep",
          )}
        >
          {view === "map" ? "Map" : "Feed"}
        </Link>
      ))}
    </nav>
  );
}
