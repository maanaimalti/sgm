"use client";

import {
  ensureServiceWorker,
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { useCallback, useEffect, useState } from "react";

export function usePush() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    setPermission(Notification.permission);
    ensureServiceWorker()
      .then(() => getExistingSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => undefined);
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await subscribeToPush();
      setIsSubscribed(ok);
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
      return ok;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setIsSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, permission, isSubscribed, busy, enable, disable };
}
