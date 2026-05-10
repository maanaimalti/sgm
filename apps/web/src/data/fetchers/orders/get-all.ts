import { api } from "@/services/api";
import type { OrderListResponse, OrderStatus } from "@sgm/shared";

interface GetAllOrdersParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  search?: string;
}

export const GetAllOrdersFetcher = async ({
  page = 1,
  pageSize = 10,
  status,
  search,
}: GetAllOrdersParams) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  const response = await api.get<OrderListResponse>(
    `/orders?${params.toString()}`,
  );
  return response.data;
};
