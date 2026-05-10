import { api } from "@/services/api";
import type { ProductForm } from "../schemas/product-schema";

export const updateProductMutation = async (
  product: ProductForm,
  productId: string,
) => {
  const { data } = await api.patch(`/products/${productId}`, {
    unityId: product.unity,
    categoryId: product.category,
    name: product.name,
    description: product.description,
    departmentId: product.department,
    costValue: product.costValue ?? 0,
    saleValue: product.saleValue,
    minStock: product.minStock,
  });

  return data;
};
