import { api } from "@/services/api";
import type { ResendInviteResponse } from "@sgm/shared";

export const resendUserInviteMutation = async (
  id: string,
): Promise<ResendInviteResponse> => {
  const { data } = await api.post<ResendInviteResponse>(`/users/${id}/invite`);
  return data;
};
