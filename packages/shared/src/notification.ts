export interface NotificationResponse {
  id: string;
  text: string;
  readableAt?: string | null;
  createdAt: string;
  updatedAt: string;
  type: string;
}
