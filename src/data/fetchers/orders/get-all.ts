import { api } from "@/services/api";

export const GetAllOrdersFetcher = async ({ page }: { page: number }) => {
  const response = await api.get<OrdersResponse>(`/orders?page=${page}`);
  return response.data;
}

interface OrdersResponse {
  orders: {
    id: string;
    status: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
    }
  }[];
  total: number;
}