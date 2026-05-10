import { api } from "@/services/api";
import type { UnityResponse } from "@sgm/shared";

export const GetAllUnitiesFetcher = async () => {
  const response = await api.get<UnityResponse[]>("/unity");
  return response.data;
};
