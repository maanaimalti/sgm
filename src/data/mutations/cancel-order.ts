import { api } from "@/services/api";

export const cancelOrderMutation = async (id: string) => {
  await api.patch(`/order/cancel/${id}`);
};
