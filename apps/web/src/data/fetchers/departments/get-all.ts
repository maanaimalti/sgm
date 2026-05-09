import { api } from "@/services/api";

export const GetAllDepartmentsFetcher = async () => {
  const response = await api.get<DepartmentsResponse[]>("/department");
  return response.data;
};

interface DepartmentsResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
