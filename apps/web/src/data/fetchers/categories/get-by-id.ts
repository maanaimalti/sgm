import type { CategoryResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetCategoryByIdFetcher = async (id: string) => {
  const response = await api.get<CategoryResponse>(`/category/${id}`);
  return response.data;
};
