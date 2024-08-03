import { api } from "@/services/api";

export const readNotificationMutation = async (notificationId: string) => {
  await api.post(`/notification/read/${notificationId}`);
};