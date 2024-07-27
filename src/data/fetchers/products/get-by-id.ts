import { api } from "@/services/api";
import type { ProductResponse } from "./product-response.interface";

export const GetProductByIdFetcher = async (id: string) => {
  const response = await api.get<ProductResponse>(`/products/${id}`);
  return response.data;
};