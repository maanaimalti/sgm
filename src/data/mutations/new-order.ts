import { api } from "@/services/api";
import type { OrderForm } from "../schemas/order-schema";

export const newOrderMutation = async (data: OrderForm) => {
  const response = await api.post("/orders", {
    items: data.items
  });
  return response.data;
};