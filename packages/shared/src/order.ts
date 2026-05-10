export type OrderStatus = "PENDING" | "APPROVED" | "CANCELED" | "PURCHASED";

export type OrderEventType =
  | "CREATED"
  | "APPROVED"
  | "CANCELED"
  | "PURCHASED"
  | "NOTE";

export interface OrderEvent {
  id: string;
  type: OrderEventType;
  createdAt: string;
  user: { id: string; name: string };
  payload?: Record<string, unknown> | null;
}

export interface OrderListItem {
  id: string;
  friendlyCode?: string | null;
  event?: string | null;
  status: OrderStatus;
  createdAt: string;
  itemCount?: number;
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
  friendlyCode?: string | null;
  event?: string | null;
  observation?: string | null;
  user: {
    id: string;
    name: string;
  };
  status: OrderStatus;
  createdAt: string;
  orderItem: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      category?: { id: string; name: string };
      costValue?: number;
      unity: {
        name: string;
      };
    };
  }[];
  events?: OrderEvent[];
}
