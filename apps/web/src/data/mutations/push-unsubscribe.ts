import { api } from "@/services/api";

export const pushUnsubscribeMutation = async (endpoint: string) => {
  await api.post("/push/unsubscribe", { endpoint });
};
