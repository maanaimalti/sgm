import type { OrderForm } from "@/data/schemas/order-schema";
import { api } from "@/services/api";

export const updateOrderMutation = async (id: string, data: OrderForm) => {
  await api.patch(`/orders/${id}`, {
    items: data.items,
    event: data.event,
    observation: data.observation,
  });
};
