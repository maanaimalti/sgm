import { api } from "@/services/api";
import type { ProductForm } from "../schemas/product-schema";

export const updateProductMutation = async (product: ProductForm) => {
  const { data } = await api.patch("/products", {
    brandName: product.brandName,
    unityId: product.unity,
    categoryId: product.category,
    name: product.name,
    description: product.description,
  });

  return data;
};
