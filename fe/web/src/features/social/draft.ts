"use client";

import { useSyncExternalStore } from "react";

/** Per-moment comment draft kept in sessionStorage so it survives closing the panel. */
const key = (momentId: string) => `mootz:comment-draft:${momentId}`;
const listeners = new Set<() => void>();

export function readDraft(momentId: string): string {
  try {
    return sessionStorage.getItem(key(momentId)) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(momentId: string, text: string) {
  try {
    if (text) sessionStorage.setItem(key(momentId), text);
    else sessionStorage.removeItem(key(momentId));
  } catch {
    /* storage unavailable: draft stays in memory only for this render */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

export function useDraft(momentId: string): [string, (text: string) => void] {
  const text = useSyncExternalStore(subscribe, () => readDraft(momentId), () => "");
  return [text, (next) => writeDraft(momentId, next)];
}
