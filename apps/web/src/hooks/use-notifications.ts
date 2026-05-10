"use client";

import { getAllNotifications } from "@/data/fetchers/notifications/get-all";
import { getPaginatedNotifications } from "@/data/fetchers/notifications/get-paginated";
import { readAllNotificationsMutation } from "@/data/mutations/read-all-notifications";
import { readNotificationMutation } from "@/data/mutations/read-notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationResponse } from "@sgm/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { presentNotification } from "@/components/notifications/notif-icon";

export type NotificationView = "unread" | "all";

export const useNotifications = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<NotificationView>("unread");

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
    isLoading:
      view === "unread" ? unreadQuery.isLoading : allQuery.isLoading,
    handleClickItem,
    handleMarkAllRead: () => readAll.mutate(),
    isMarkingAllRead: readAll.isPending,
  };
};
