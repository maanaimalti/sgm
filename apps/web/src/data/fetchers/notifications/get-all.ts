import { api } from "@/services/api";

export const getAllNotifications = async () => {
  const response = await api.get<NotificationsResponse[]>("/notification");
  // const opa: NotificationsResponse[] = [
  //   {
  //     id: "1",
  //     text: "opa",
  //     createdAt: "opa",
  //     updatedAt: "opa",
  //     readableAt: null,
  //     type: "ORDER_REPORT",
  //   },
  //   {
  //     id: "2",
  //     text: "opa",
  //     createdAt: "opa",
  //     updatedAt: "opa",
  //     readableAt: "122",
  //     type: "ORDER_REPORT",
  //   },
  // ];
  return response.data;
};

interface NotificationsResponse {
  id: string;
  text: string;
  readableAt?: string | null;
  createdAt: string;
  updatedAt: string;
  type: string;
}
