import { api } from "@/services/api";
import type { StockMovementForm } from "../schemas/stock-movement-schema";

export const updateStockMutation = async (data: StockMovementForm) => {
  const response = await api.post("/movement", {
    productId: data.productId,
    quantity: data.quantity,
    type: data.type,
  });
  return response.data;
};
