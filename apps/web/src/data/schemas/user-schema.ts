import { ROLES } from "@sgm/shared";
import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string({ message: "Nome é obrigatório" })
    .min(3, { message: "Nome deve ter no mínimo 3 caracteres" })
    .max(120, { message: "Nome deve ter no máximo 120 caracteres" }),
  username: z
    .string({ message: "Nome de usuário é obrigatório" })
    .regex(/^[a-z0-9._-]{3,32}$/i, {
      message: "De 3 a 32 caracteres: letras, números, ponto, hífen ou _",
    }),
  email: z
    .string({ message: "E-mail é obrigatório" })
    .min(1, { message: "E-mail é obrigatório" })
    .email({ message: "Informe um e-mail válido" }),
  password: z
    .string({ message: "Senha é obrigatória" })
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
    .max(72, { message: "Senha deve ter no máximo 72 caracteres" }),
  roles: z
    .array(z.enum(ROLES))
    .min(1, { message: "Escolha ao menos um papel" }),
  departmentIds: z
    .array(z.string())
    .min(1, { message: "Escolha ao menos um setor" }),
});

export const updateUserSchema = z.object({
  name: z
    .string({ message: "Nome é obrigatório" })
    .min(3, { message: "Nome deve ter no mínimo 3 caracteres" })
    .max(120, { message: "Nome deve ter no máximo 120 caracteres" }),
  roles: z
    .array(z.enum(ROLES))
    .min(1, { message: "Escolha ao menos um papel" }),
  departmentIds: z
    .array(z.string())
    .min(1, { message: "Escolha ao menos um setor" }),
});

export const updateUserEmailSchema = z.object({
  email: z
    .string({ message: "E-mail é obrigatório" })
    .min(1, { message: "E-mail é obrigatório" })
    .email({ message: "Informe um e-mail válido" }),
});

export type CreateUserForm = z.infer<typeof createUserSchema>;
export type UpdateUserForm = z.infer<typeof updateUserSchema>;
export type UpdateUserEmailForm = z.infer<typeof updateUserEmailSchema>;
