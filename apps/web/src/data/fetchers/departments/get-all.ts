import { api } from "@/services/api";
import type { DepartmentResponse } from "@sgm/shared";

export const GetAllDepartmentsFetcher = async () => {
  const response = await api.get<DepartmentResponse[]>("/department");
  return response.data;
};
