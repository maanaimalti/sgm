import { api } from "@/services/api";
import type { UnitWithIdForm } from "../schemas/unit-schema";

export const updateUnitMutation = async (data: UnitWithIdForm) => {
  const { id, ...rest } = data;
  await api.patch(`/unity/${id}`, rest);
};
