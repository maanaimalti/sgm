import { api } from "@/services/api";

export const GetUnitByIdFetcher = async (id: string) => {
  const response = await api.get<UnitResponse>(`/unity/${id}`);
  return response.data;
};

interface UnitResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
