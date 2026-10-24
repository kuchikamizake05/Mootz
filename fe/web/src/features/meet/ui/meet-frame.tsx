"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Full-screen flow on phones; a centered dialog-like card on desktop (10.09 / 10.13). */
export function MeetFrame({
  title,
  onClose,
  tone = "light",
  children,
}: {
  title: string;
  onClose?: () => void;
  tone?: "light" | "deep";
  children: ReactNode;
}) {
  const deep = tone === "deep";
  return (
    <main className={cn("min-h-dvh lg:grid lg:place-items-center lg:p-8", deep ? "bg-mootz-deep text-white" : "bg-mootz-canvas text-mootz-ink")}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-[430px] flex-col gap-4 px-4 pb-8 pt-4",
          "lg:max-w-[560px] lg:rounded-[32px] lg:p-8 lg:shadow-float",
          deep ? "lg:bg-mootz-deep" : "lg:bg-mootz-canvas",
        )}
      >
        <header className="flex min-h-11 items-center justify-between gap-3">
          <h1 className="font-display text-[28px] leading-none">{title}</h1>
          {onClose && <IconButton icon={X} label="Close" onClick={onClose} />}
        </header>
        {children}
      </div>
    </main>
  );
}

/** Honest label for UI-only fixture flows. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <p className={cn("w-fit rounded-full bg-mootz-lilac px-3 py-1 text-xs font-extrabold text-mootz-deep", className)}>
      Demo · not connected
    </p>
  );
}
