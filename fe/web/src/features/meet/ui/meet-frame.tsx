"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { AppShell } from "@/features/shell/app-shell";
import { MapView } from "@/features/map/map-view";
import { X } from "lucide-react";
import { BackButton, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const desktopQuery = "(min-width: 1024px)";
const subscribeDesktop = (notify: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverDesktopSnapshot = () => false;

/** Full-screen flow on phones; a centered dialog-like card on desktop (10.09 / 10.13). */
export function MeetFrame({
  title,
  onClose,
  onBack,
  centeredTitle = false,
  tone = "light",
  wide = false,
  children,
}: {
  title: string;
  onClose?: () => void;
  onBack?: () => void;
  centeredTitle?: boolean;
  tone?: "light" | "deep";
  wide?: boolean;
  children: ReactNode;
}) {
  const deep = tone === "deep";
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, serverDesktopSnapshot);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!deep || !desktop) return;
    const panel = panelRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (panel?.querySelector<HTMLElement>("button, a[href]") ?? panel)?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeRef.current) {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab" || !panel) return;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'));
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus({ preventScroll: true }); };
  }, [deep, desktop]);
  return (
    <>
      {deep && desktop && (
        <div aria-hidden inert className="fixed inset-0">
          <AppShell><MapView /></AppShell>
          <div className="absolute inset-0 z-40 bg-mootz-ink/45" />
        </div>
      )}
    <main className={cn("relative min-h-dvh lg:grid lg:place-items-center lg:p-8", deep ? "bg-mootz-deep text-white lg:bg-transparent" : "bg-mootz-canvas text-mootz-ink")}>
      <div
        ref={panelRef}
        tabIndex={deep && desktop ? -1 : undefined}
        role={deep && desktop ? "dialog" : undefined}
        aria-modal={deep && desktop ? true : undefined}
        aria-label={deep && desktop ? title : undefined}
        className={cn(
          "mx-auto flex min-h-svh w-full min-w-0 max-w-[560px] flex-col gap-5 px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:px-6",
          "lg:min-h-0 lg:rounded-3xl lg:p-8 lg:shadow-float",
          wide ? "lg:max-w-[880px]" : "lg:max-w-[560px]",
          deep ? "lg:bg-mootz-deep" : "lg:bg-mootz-surface",
        )}
      >
        <header className="flex min-h-11 items-center justify-between gap-3">
          <div className={cn("flex min-w-0 flex-1 items-center gap-2", centeredTitle && "relative justify-center")} >
            {onBack && <BackButton onClick={onBack} className={cn(centeredTitle && "absolute left-0", deep && "text-white")} />}
            <h1 className={cn("min-w-0 text-balance font-display text-[28px] leading-tight sm:text-[30px]", centeredTitle && "px-11 text-center")}>{title}</h1>
          </div>
          {onClose && <IconButton icon={X} label="Close" onClick={onClose} />}
        </header>
        {children}
      </div>
    </main>
    </>
  );
}

/** Honest label for UI-only fixture flows. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <p className={cn("w-fit rounded-full bg-mootz-lilac px-3 py-1 text-[13px] font-extrabold text-mootz-deep", className)}>
      Demo · not connected
    </p>
  );
}
