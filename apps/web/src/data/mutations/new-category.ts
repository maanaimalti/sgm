import { api } from "@/services/api";
import type { CategoryForm } from "../schemas/category-schema";

export const newCategoryMutation = async (data: CategoryForm) => {
  await api.post("/category", data);
};
