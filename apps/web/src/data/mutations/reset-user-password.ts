import { api } from "@/services/api";

export const resetUserPasswordMutation = async ({
  userId,
  newPassword,
}: {
  userId: string;
  newPassword: string;
}) => {
  const response = await api.post(`/users/${userId}/reset-password`, {
    newPassword,
  });
  return response.data;
};
