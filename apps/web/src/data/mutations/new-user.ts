import { api } from "@/services/api";
import type { CreateUserForm } from "../schemas/user-schema";

export const newUserMutation = async (data: CreateUserForm) => {
  await api.post("/users", data);
};
