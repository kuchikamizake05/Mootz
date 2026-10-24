"use client";

import { useEffect, useRef } from "react";

/** True while the component is mounted, so late async results can be dropped after unmount. */
export function useAlive() {
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return alive;
}

/**
 * Runs `start` once per mounted component, even under React Strict Mode's double effect,
 * which would otherwise open two Offers. Call it after `useAlive()`.
 */
export function useStartOnce(start: () => void) {
  const latest = useRef(start);
  const started = useRef(false);
  useEffect(() => {
    latest.current = start;
  });
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    latest.current();
  }, []);
}
