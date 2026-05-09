import type { CategoryResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetAllCategoriesFetcher = async () => {
  const response = await api.get<CategoryResponse[]>("/category");
  return response.data;
};
