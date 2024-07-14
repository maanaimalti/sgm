import { api } from "@/services/api";

export const deleteCategoryMutation = async (id: string) => {
  await api.delete(`/category/${id}`);
}