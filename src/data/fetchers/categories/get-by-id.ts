import { api } from "@/services/api";

export const GetCategoryByIdFetcher = async (id: string) => {
  const response = await api.get<CategoryResponse>(`/category/${id}`);
  return response.data;
};

interface CategoryResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}