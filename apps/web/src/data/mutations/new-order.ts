import { api } from "@/services/api";
import type { OrderForm } from "@/data/schemas/order-schema";

export const newOrderMutation = async (data: OrderForm) => {
  const response = await api.post<{ id: string }>("/orders", {
    items: data.items,
    event: data.event,
    observation: data.observation,
  });
  return response.data;
};
