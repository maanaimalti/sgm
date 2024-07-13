import { api } from "@/services/api";

export const GetAllUnitiesFetcher = async () => {
  const response = await api.get<UnityResponse[]>("/unity");
  return response.data;
};

interface UnityResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
