"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useOwnUsername } from "./queries";

const key = "mootz:username-prompt-dismissed";
const listeners = new Set<() => void>();
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => void listeners.delete(notify);
};
// Server snapshot is "dismissed" so nothing flashes before hydration.
const dismissed = () => {
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
};

/** Non-blocking nudge for accounts without a username; dismissal lasts for the session. */
export function UsernamePrompt({ next }: { next: string }) {
  const username = useOwnUsername();
  const hidden = useSyncExternalStore(subscribe, dismissed, () => true);
  if (username !== null || hidden) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(key, "1"); } catch { /* Without storage it returns on reload, which is fine. */ }
    listeners.forEach((notify) => notify());
  };

  return (
    <div role="status" className="pointer-events-auto absolute inset-x-4 top-[80px] z-20 mx-auto flex max-w-[420px] items-center gap-3 rounded-[22px] bg-mootz-surface px-4 py-3 shadow-soft lg:top-[100px]">
      <p className="min-w-0 flex-1 text-sm font-bold text-mootz-ink">
        Pick a username so friends can find you.{" "}
        <Link href={`/profile/username?next=${encodeURIComponent(next)}`} className="font-extrabold text-mootz-deep underline">Choose username</Link>
      </p>
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="grid size-9 shrink-0 place-items-center text-mootz-muted"><X size={18} /></button>
    </div>
  );
}
