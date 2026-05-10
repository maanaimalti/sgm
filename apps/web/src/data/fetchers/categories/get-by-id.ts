import { api } from "@/services/api";
import type { CategoryResponse } from "@sgm/shared";

export const GetCategoryByIdFetcher = async (id: string) => {
  const response = await api.get<CategoryResponse>(`/category/${id}`);
  return response.data;
};
