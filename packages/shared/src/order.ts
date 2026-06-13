export type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "PURCHASED";

export type OrderEventType =
  | "CREATED"
  | "APPROVED"
  | "REJECTED"
  | "RESUBMITTED"
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
  statusObservation?: string | null;
  user: {
    id: string;
    name: string;
  };
  status: OrderStatus;
  approvedBy?: { id: string; name: string } | null;
  approvedAt?: string | null;
  rejectedBy?: { id: string; name: string } | null;
  rejectedAt?: string | null;
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
