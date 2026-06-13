"use client";

import { ensureServiceWorker } from "@/lib/push";
import { useEffect } from "react";

/** Registers the service worker once for the authenticated app shell. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    void ensureServiceWorker();
  }, []);
  return null;
}
