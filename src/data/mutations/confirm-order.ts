import { api } from "@/services/api";

export const confirmOrderMutation = async (id: string) => {
  await api.patch(`/orders/approve/${id}`);
};
