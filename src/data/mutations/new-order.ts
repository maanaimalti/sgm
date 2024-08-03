import { api } from "@/services/api";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const newOrderMutation = async (data: any) => {
  const response = await api.post("/orders", {
    items: data.items,
    eventName: data?.eventName,
    observation: data?.observation,
  });
  return response.data;
};