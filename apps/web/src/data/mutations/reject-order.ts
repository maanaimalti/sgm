import { api } from "@/services/api";

export const rejectOrderMutation = async (id: string, observation: string) => {
  await api.patch(`/orders/reject/${id}`, { observation });
};
