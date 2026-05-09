import type { StockResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const getAllStockFetcher = async ({
  page = 1,
  pageSize = 900,
}: Props): Promise<StockResponse[]> => {
  const response = await api.get(
    `/movement/stock?page=${page}&pageSize=${pageSize}`,
  );
  return response.data;
};

type Areas = "all" | "kitchen" | "lib";

interface Props {
  page?: number;
  pageSize?: number;
  area?: Areas;
}
