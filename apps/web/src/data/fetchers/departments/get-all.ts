import type { DepartmentResponse } from "@sgm/shared";
import { api } from "@/services/api";

export const GetAllDepartmentsFetcher = async () => {
  const response = await api.get<DepartmentResponse[]>("/department");
  return response.data;
};
