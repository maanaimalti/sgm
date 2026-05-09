import { api } from "@/services/api";
import type { CategoryWithIdForm } from "../schemas/category-schema";

export const updateCategoryMutation = async (data: CategoryWithIdForm) => {
  const { id, ...rest } = data;
  await api.patch(`/category/${id}`, rest);
};
