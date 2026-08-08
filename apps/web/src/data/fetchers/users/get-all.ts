import { api } from "@/services/api";
import type { UserListItem } from "@sgm/shared";

export const GetAllUsersFetcher = async () => {
  const response = await api.get<UserListItem[]>("/users");
  return response.data;
};
