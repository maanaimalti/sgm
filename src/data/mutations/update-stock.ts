import { api } from "@/services/api";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const updateStockMutation = async (data: any) => {
  const response = await api.post("/movement/batch", {
    items: data.items,
  });
  return response.data;
};
