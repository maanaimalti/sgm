"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

const subscribe = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};

const getSnapshot = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
};

const getServerSnapshot = () => false;

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
