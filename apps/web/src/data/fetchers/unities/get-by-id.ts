import type { UnityResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetUnitByIdFetcher = async (id: string) => {
  const response = await api.get<UnityResponse>(`/unity/${id}`);
  return response.data;
};
