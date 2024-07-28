import { api } from "@/services/api";

export const GetOrderReportFetcher = async (id: string) => {
  try {
    const response = await api.get<{url: string}>(`/orders/report/${id}`);
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};
