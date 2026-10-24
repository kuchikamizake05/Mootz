"use client";

import { useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  const timer = setInterval(notify, 500);
  return () => clearInterval(timer);
};
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Wall clock in whole seconds as an external store (no setState in effects). 0 during SSR. */
export function useNowSeconds() {
  return useSyncExternalStore(subscribe, nowSeconds, () => 0);
}

const noop = () => () => {};

/** False on the server and during hydration, true afterwards. Gates anything clock-dependent. */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
