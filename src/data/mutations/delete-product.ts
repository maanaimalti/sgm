import { api } from "@/services/api";

export const deleteProductMutation = async (id: string) => {
  await api.delete(`/products/${id}`);
};
