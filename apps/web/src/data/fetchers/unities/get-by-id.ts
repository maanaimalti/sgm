import { api } from "@/services/api";
import type { UnityResponse } from "@sgm/shared";

export const GetUnitByIdFetcher = async (id: string) => {
  const response = await api.get<UnityResponse>(`/unity/${id}`);
  return response.data;
};
