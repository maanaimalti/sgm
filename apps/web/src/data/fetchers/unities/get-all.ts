import { api } from "@/services/api";

export const GetAllUnitiesFetcher = async () => {
  const response = await api.get<UnitResponse[]>("/unity");
  return response.data;
};

interface UnitResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
