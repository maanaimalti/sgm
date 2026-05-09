import { api } from "@/services/api";
import type { LoginForm } from "../schemas/login-schema";

export const loginMutation = async (data: LoginForm) => {
  const response = await api.post<LoginResponse>("/auth/login", data);
  return response.data;
};

interface LoginResponse {
  accessToken: string;
}
