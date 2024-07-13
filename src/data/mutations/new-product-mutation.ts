
import { api } from "@/services/api";
import type { ProductForm } from "../schemas/product-schema";

export const newProductMutation = async (
  product: ProductForm,
) => {
  const { data } = await api.post<CreateProductResponse>("/products", {
    quantity: product.quantity,
    brandName: product.brandName,
    unity: product.unity,
    category: product.category,
    name: product.name,
    description: product.description,
  });

  return data;
};

interface CreateProductResponse {
  product: ProductForm;
  presignedUrl?: string;
}
