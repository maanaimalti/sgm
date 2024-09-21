import { api } from "@/services/api";

export const generateOrderReportMutation = async (orderId: string) => {
  await api.post('/orders/report', { orderId });
}