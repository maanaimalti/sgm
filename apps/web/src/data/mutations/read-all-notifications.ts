import { api } from "@/services/api";

export const readAllNotificationsMutation = async () => {
  const response = await api.patch<{ updated: number }>(
    "/notification/read-all",
  );
  return response.data;
};
