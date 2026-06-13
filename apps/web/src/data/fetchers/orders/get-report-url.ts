import { api } from "@/services/api";

export type OrderReportStatusResponse =
  | { status: "ready"; url: string; stale?: boolean }
  | { status: "processing" }
  | { status: "none" };

export const GetOrderReportFetcher = async (
  id: string,
): Promise<OrderReportStatusResponse | null> => {
  try {
    const response = await api.get<OrderReportStatusResponse>(
      `/orders/report/${id}`,
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};
