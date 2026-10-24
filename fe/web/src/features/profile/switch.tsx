"use client";

import { cn } from "@/lib/cn";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60", checked ? "bg-mootz-deep" : "bg-mootz-lilac")}
    >
      <span className={cn("absolute top-1 size-6 rounded-full bg-white shadow transition-all", checked ? "left-7" : "left-1")} />
    </button>
  );
}
