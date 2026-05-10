import { api } from "@/services/api";
import type { NotificationListResponse } from "@sgm/shared";

interface Params {
  page?: number;
  pageSize?: number;
}

export const getPaginatedNotifications = async ({
  page = 1,
  pageSize = 20,
}: Params = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  const response = await api.get<NotificationListResponse>(
    `/notification/all?${params.toString()}`,
  );
  return response.data;
};
