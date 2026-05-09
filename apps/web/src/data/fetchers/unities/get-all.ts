import type { UnityResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetAllUnitiesFetcher = async () => {
  const response = await api.get<UnityResponse[]>("/unity");
  return response.data;
};
