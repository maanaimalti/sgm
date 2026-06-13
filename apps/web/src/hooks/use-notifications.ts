"use client";

import { presentNotification } from "@/components/notifications/notif-icon";
import { getAllNotifications } from "@/data/fetchers/notifications/get-all";
import { getPaginatedNotifications } from "@/data/fetchers/notifications/get-paginated";
import { readAllNotificationsMutation } from "@/data/mutations/read-all-notifications";
import { readNotificationMutation } from "@/data/mutations/read-notification";
import type { NotificationResponse, NotificationType } from "@sgm/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NotificationView = "unread" | "all";

const ORDER_LIST_TYPES: NotificationType[] = [
  "PENDING_ORDER",
  "ORDER_RESUBMITTED",
  "ORDER_APPROVED",
  "ORDER_REJECTED",
  "ORDER_CANCELED",
];

const ORDER_DETAIL_TYPES: NotificationType[] = [
  "ORDER_APPROVED",
  "ORDER_REJECTED",
  "ORDER_CANCELED",
  "ORDER_RESUBMITTED",
];

const ORDER_REPORT_TYPES: NotificationType[] = [
  "REPORT_READY",
  "REPORT_FAILED",
  "ORDER_REPORT",
];

function parseMetadata(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export const useNotifications = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<NotificationView>("unread");
  const seenIdsRef = useRef<Set<string> | null>(null);

  const unreadQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: getAllNotifications,
    refetchInterval: 1000 * 60 * 2,
  });

  const allQuery = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => getPaginatedNotifications({ page: 1, pageSize: 50 }),
    enabled: view === "all",
  });

  useEffect(() => {
    const list = unreadQuery.data;
    if (!list) return;
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(list.map((n) => n.id));
      return;
    }
    const seen = seenIdsRef.current;
    const fresh = list.filter((n) => !seen.has(n.id));
    for (const n of fresh) {
      seen.add(n.id);
      const meta = parseMetadata(n.metadata);
      if (ORDER_LIST_TYPES.includes(n.type)) {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
      if (ORDER_DETAIL_TYPES.includes(n.type) && meta.orderId) {
        queryClient.invalidateQueries({ queryKey: ["order", meta.orderId] });
      }
      if (ORDER_REPORT_TYPES.includes(n.type) && meta.orderId) {
        queryClient.invalidateQueries({
          queryKey: ["order-report", meta.orderId],
        });
      }
    }
  }, [unreadQuery.data, queryClient]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const readOne = useMutation({
    mutationFn: (id: string) => readNotificationMutation(id),
    onSuccess: invalidate,
  });

  const readAll = useMutation({
    mutationFn: readAllNotificationsMutation,
    onSuccess: invalidate,
  });

  const unread = unreadQuery.data ?? [];
  const unreadCount = unread.filter((n) => !n.readableAt).length;

  const allItems = allQuery.data?.notifications ?? [];
  const totalUnread = allQuery.data?.unreadCount ?? unreadCount;

  const items = view === "unread" ? unread : allItems;

  const handleClickItem = async (n: NotificationResponse) => {
    if (!n.readableAt) {
      readOne.mutate(n.id);
    }
    const presentation = presentNotification(n);
    if (presentation.deeplink) {
      router.push(presentation.deeplink);
    }
  };

  return {
    view,
    setView,
    items,
    unread,
    unreadCount,
    totalUnread,
    isLoading: view === "unread" ? unreadQuery.isLoading : allQuery.isLoading,
    handleClickItem,
    handleMarkAllRead: () => readAll.mutate(),
    isMarkingAllRead: readAll.isPending,
  };
};
