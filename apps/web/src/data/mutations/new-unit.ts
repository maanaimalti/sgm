import { api } from "@/services/api";
import type { UnitForm } from "../schemas/unit-schema";

export const newUnitMutation = async (data: UnitForm) => {
  await api.post("/unity", data);
};
