import type { OrderListResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetAllOrdersFetcher = async ({ page }: { page: number }) => {
  const response = await api.get<OrderListResponse>(`/orders?page=${page}`);
  return response.data;
};
