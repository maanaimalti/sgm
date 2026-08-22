import { api } from "@/services/api";
import type { UpdateUserPayload } from "@sgm/shared";

export const updateUserMutation = async ({
  userId,
  ...payload
}: UpdateUserPayload & { userId: string }) => {
  await api.patch(`/users/${userId}`, payload);
};
