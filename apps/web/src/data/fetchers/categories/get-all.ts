import { api } from "@/services/api";
import type { CategoryResponse } from "@sgm/shared";

export const GetAllCategoriesFetcher = async () => {
  const response = await api.get<CategoryResponse[]>("/category");
  return response.data;
};
