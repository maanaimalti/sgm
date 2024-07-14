import { api } from "@/services/api";

export const deleteUnitMutation = async (id: string) => {
  await api.delete(`/unity/${id}`);
};
