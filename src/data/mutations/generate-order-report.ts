import { api } from "@/services/api";

export const generateOrderReportMutation = async (id: string) => {
  await api.post<{url: string}>(`/orders/report/${id}`);
}