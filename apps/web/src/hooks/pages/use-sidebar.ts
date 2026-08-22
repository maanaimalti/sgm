import { getAllNotifications } from "@/data/fetchers/notifications/get-all";
import { readNotificationMutation } from "@/data/mutations/read-notification";
import { useQuery } from "@tanstack/react-query";
import { useRoles } from "../use-auth";

export const useSidebar = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: getAllNotifications,
    refetchInterval: 1000 * 60 * 2,
  });
  const { isAdmin, isKitchen, isManager, isBuyer } = useRoles();

  const handleClickNotification = async (notification: {
    id: string;
    type: string;
  }) => {
    if (notification.type !== "ORDER_REPORT") return;
    await Promise.all([readNotificationMutation(notification.id)]);
  };

  return {
    notifications: data,
    notificationsIsLoading: isLoading,
    isAdmin,
    isKitchen,
    isManager,
    isBuyer,
    handleClickNotification,
  };
};
