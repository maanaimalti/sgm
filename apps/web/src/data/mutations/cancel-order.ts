import { api } from "@/services/api";

export const cancelOrderMutation = async (id: string, observation?: string) => {
  await api.patch(`/orders/cancel/${id}`, { observation });
};
