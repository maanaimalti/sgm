import type { NotificationResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const getAllNotifications = async () => {
  const response = await api.get<NotificationResponse[]>("/notification");
  return response.data;
};
