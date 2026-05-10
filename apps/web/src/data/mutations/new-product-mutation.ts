import { api } from "@/services/api";
import type { ProductForm } from "../schemas/product-schema";

export const newProductMutation = async (product: ProductForm) => {
  const { data } = await api.post("/products", {
    unityId: product.unity,
    categoryId: product.category,
    name: product.name,
    brandName: product.brand,
    description: product.description,
    departmentId: product.department,
    costValue: product.costValue ?? 0,
    saleValue: product.saleValue,
    minStock: product.minStock,
  });

  if (product.initialStock && product.initialStock > 0 && data?.id) {
    try {
      await api.post("/movement", {
        productId: data.id,
        quantity: product.initialStock,
        type: "in",
      });
    } catch {
      // ignore — product still created
    }
  }

  return data;
};
