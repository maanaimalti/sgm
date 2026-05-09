import { api } from "@/services/api";

export const GetOrderByIdFetcher = async (id: string) => {
  const response = await api.get<OrderResponse>(`/orders/${id}`);
  return response.data;
};

interface OrderResponse {
  id: string;
  user: {
    id: string;
    name: string;
  };
  status: "APPROVED" | "CANCELED" | "PENDING";
  createdAt: string;
  orderItem: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      unity: {
        name: string;
      };
    };
  }[];
}
