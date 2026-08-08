import { api } from "@/services/api";

export const updateUserEmailMutation = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) => {
  await api.patch(`/users/${userId}/email`, { email });
};
