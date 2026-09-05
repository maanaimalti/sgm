import type { SetPasswordForm } from "@/data/schemas/password-schema";
import { api } from "@/services/api";

export const setPasswordMutation = async (data: SetPasswordForm) => {
  await api.post("/auth/set-password", { newPassword: data.newPassword });
};
