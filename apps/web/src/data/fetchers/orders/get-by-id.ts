import { api } from "@/services/api";
import type { OrderResponse } from "@sgm/shared";

export const GetOrderByIdFetcher = async (id: string) => {
  const response = await api.get<OrderResponse>(`/orders/${id}`);
  return response.data;
};
