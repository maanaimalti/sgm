export type OrderStatus = "PENDING" | "APPROVED" | "CANCELED" | "PURCHASED";

export interface OrderListItem {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface OrderListResponse {
  orders: OrderListItem[];
  total: number;
}

export interface OrderResponse {
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
