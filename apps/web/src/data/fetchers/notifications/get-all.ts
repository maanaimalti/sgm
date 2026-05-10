import { api } from "@/services/api";
import type { NotificationResponse } from "@sgm/shared";

export const getAllNotifications = async () => {
  const response = await api.get<NotificationResponse[]>("/notification");
  return response.data;
};
