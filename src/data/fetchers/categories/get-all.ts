import { api } from "@/services/api";

export const GetAllCategoriesFetcher = async () => {
  const response = await api.get<CategoriesResponse[]>("/category");
  return response.data;
};

interface CategoriesResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
