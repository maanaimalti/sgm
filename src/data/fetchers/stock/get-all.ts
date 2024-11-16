import { api } from "@/services/api";
import type { StockReponse } from "./stock-response.interface";

export const getAllStockFetcher = async ({
  page = 1,
  pageSize = 900,
}: Props): Promise<StockReponse[]> => {
  const response = await api.get(
    `/movement/stock?page=${page}&pageSize=${pageSize}`
  );
  return response.data;
};

type Areas = "all" | "kitchen" | "lib";

interface Props {
  page?: number;
  pageSize?: number;
  area?: Areas;
}
