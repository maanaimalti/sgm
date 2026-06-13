export type NotificationType =
  | "PENDING_ORDER"
  | "LOW_STOCK"
  | "ORDER_APPROVED"
  | "ORDER_REJECTED"
  | "ORDER_RESUBMITTED"
  | "ORDER_CANCELED"
  | "ORDER_REPORT"
  | "REPORT_READY"
  | "REPORT_FAILED";

export interface NotificationResponse {
  id: string;
  text: string;
  readableAt?: string | null;
  createdAt: string;
  updatedAt: string;
  type: NotificationType;
  metadata?: string | null;
}

export interface NotificationListResponse {
  notifications: NotificationResponse[];
  total: number;
  unreadCount: number;
}
