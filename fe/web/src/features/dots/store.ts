"use client";

import { useSyncExternalStore } from "react";
import { env } from "@/lib/env";
import { DEMO_VIEWER_ID, demoDots, demoMarks } from "./demo";
import type { HiddenMark } from "./model";

/*
 * Client-side memory of Dot visibility. The API exposes `hidden` but never who hid it, so the
 * viewer's own hide is remembered here (localStorage) and a 409 on restore marks "other".
 * In demo mode the same store also holds the local hidden state; the API is never called.
 */
const KEY = "mootz.dots.hiddenMarks";
const EMPTY: Record<string, HiddenMark> = {};
const EMPTY_HIDDEN: Record<string, boolean> = {};

let marks: Record<string, HiddenMark> = EMPTY;
let loaded = false;
let demoHidden: Record<string, boolean> = env.demoFixtures ? Object.fromEntries(demoDots.map((d) => [d.id, d.hidden])) : EMPTY_HIDDEN;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    marks = { ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, HiddenMark>) };
  } catch {
    marks = {};
  }
  if (env.demoFixtures) marks = { ...Object.fromEntries(Object.entries(demoMarks).map(([id, m]) => [markKey(DEMO_VIEWER_ID, id), m])), ...marks };
}

const emit = () => listeners.forEach((l) => l());

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Key is scoped by viewer so shared browsers do not mix marks. */
export const markKey = (viewerId: string, dotId: string) => `${viewerId}:${dotId}`;

export function setMark(key: string, mark: HiddenMark | null) {
  load();
  const next = { ...marks };
  if (mark) next[key] = mark;
  else delete next[key];
  marks = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the mark lasts for this page only */
  }
  emit();
}

export function setDemoHidden(dotId: string, hidden: boolean) {
  demoHidden = { ...demoHidden, [dotId]: hidden };
  emit();
}

export function useHiddenMark(key: string): HiddenMark | null {
  return useSyncExternalStore(
    subscribe,
    () => (load(), marks[key] ?? null),
    () => null,
  );
}

export function useDemoHidden(): Record<string, boolean> {
  return useSyncExternalStore(subscribe, () => demoHidden, () => demoHidden);
}
