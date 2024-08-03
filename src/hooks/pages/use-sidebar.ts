import { getAllNotifications } from "@/data/fetchers/notifications/get-all";
import { readNotificationMutation } from "@/data/mutations/read-notification";
import { useQuery } from "@tanstack/react-query";
import { useJwt } from "../use-jwt";

export const useSidebar = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getAllNotifications,
    refetchInterval: (1000 * 60) * 2
  });
  const userData = useJwt<UserData>("accessToken");

  const handleClickNotification = async (notification: { id: string, type: string }) => {
    if (notification.type !== "ORDER_REPORT") return;
    await Promise.all([readNotificationMutation(notification.id)]);

  }

  return {
    notifications: data,
    notificationsIsLoading: isLoading,
    isAdmin: userData?.roles.includes("admin"),
    isKitchen: userData?.roles.includes("kitchen"),
    isManager: userData?.roles.includes("manager"),
    isBuyer: userData?.roles.includes("buyer"),
    handleClickNotification
  };
}

interface UserData {
  username: string;
  sub: string;
  roles: string[];
}