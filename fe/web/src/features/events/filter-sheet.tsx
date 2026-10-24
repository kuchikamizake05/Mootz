"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { CalendarDays, X } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import type { MomentFilter } from "@/features/moments/model";
import { useEvents } from "./queries";

const order: MomentFilter[] = ["all", "friends", "events"];
const titles: Record<MomentFilter, string> = { all: "All", friends: "Friends", events: "Events" };

/** 08.01: one filter for Map and Feed. It narrows what you already may see; it never grants access. */
export function FilterSheet({ value, onChange, onClose }: { value: MomentFilter; onChange: (f: MomentFilter) => void; onClose: () => void }) {
  const events = useEvents();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Focus the dialog on open, close on Escape, and hand focus back to the opener.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  const names = events.data?.map((e) => e.title) ?? [];
  const description: Record<MomentFilter, string> = {
    all: "All moments you may view · Default",
    friends: "Shared directly by your friends",
    events: events.isPending
      ? "Loading events…"
      : events.isError
        ? "Events unavailable right now"
        : names.length === 0
          ? "No events yet"
          : names.length > 2
            ? `${names.slice(0, 2).join(" · ")} · +${names.length - 2} more`
            : names.join(" · "),
  };

  const move = (e: KeyboardEvent, index: number) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = order[(index + step + order.length) % order.length]!;
    onChange(next);
    panel.current?.querySelector<HTMLElement>(`[data-filter="${next}"]`)?.focus();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-mootz-ink/30 lg:items-center" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-[560px] flex-col gap-3 overflow-y-auto rounded-t-[32px] bg-mootz-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2.5 shadow-float lg:rounded-[32px] lg:pb-4"
      >
        <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-mootz-handle lg:hidden" />
        <div className="flex items-start justify-between gap-3">
          <h2 id="filter-title" className="font-display text-[32px] leading-none text-mootz-ink">
            Filter moments
          </h2>
          <IconButton icon={X} label="Close filter" onClick={onClose} />
        </div>
        <p className="text-sm text-mootz-muted">Choose which authorized moments you see. The same filter stays active in Map and Feed.</p>
        {env.demoFixtures && <p className="w-fit rounded-full bg-mootz-lilac px-3 py-1 text-[13px] font-bold text-mootz-deep">Demo fixtures · fictional data</p>}
        <div role="radiogroup" aria-label="Moment filter" className="flex flex-col gap-1">
          {order.map((f, i) => {
            const selected = f === value;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={selected}
                data-filter={f}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(f)}
                onKeyDown={(e) => move(e, i)}
                className={cn("flex min-h-14 flex-col items-start justify-center rounded-3xl px-3.5 py-2 text-left", selected ? "bg-mootz-lilac" : "bg-mootz-surface")}
              >
                <span className="font-display text-2xl leading-tight text-mootz-ink">{titles[f]}</span>
                <span className="text-[13px] font-semibold text-mootz-muted">{description[f]}</span>
              </button>
            );
          })}
        </div>
        {events.data && events.data.length > 0 && (
          <ul className="flex flex-col gap-1">
            {events.data.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  aria-label={`${e.title} event details`}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-mootz-hairline px-3 text-sm font-extrabold text-mootz-deep"
                >
                  <CalendarDays aria-hidden size={18} />{events.data.length > 1 ? `${e.title} · Event details` : "Event details"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
