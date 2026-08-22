import { api } from "@/services/api";
import type { AuthUser } from "@sgm/shared";

export const GetAuthMeFetcher = async () => {
  const response = await api.get<AuthUser>("/auth/me");
  return response.data;
};

export const authMeQueryKey = ["auth", "me"] as const;
