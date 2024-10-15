
import { api } from "@/services/api";
import type { ProductForm } from "../schemas/product-schema";

export const newProductMutation = async (
  product: ProductForm,
) => {
  const { data } = await api.post("/products", {
    unityId: product.unity,
    categoryId: product.category,
    name: product.name,
    description: product.description,
    departmentId: product.department,
    costValue: product.costValue,
    saleValue: product.saleValue,
  });

  return data;
};
