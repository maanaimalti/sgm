import type { ProductResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetProductByIdFetcher = async (id: string) => {
  const response = await api.get<ProductResponse>(`/products/${id}`);
  return response.data;
};
