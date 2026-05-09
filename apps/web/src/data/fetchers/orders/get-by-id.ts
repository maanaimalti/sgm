import type { OrderResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetOrderByIdFetcher = async (id: string) => {
  const response = await api.get<OrderResponse>(`/orders/${id}`);
  return response.data;
};
