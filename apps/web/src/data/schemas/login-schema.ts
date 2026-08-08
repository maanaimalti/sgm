import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ message: "E-mail é obrigatório" })
    .min(1, { message: "E-mail é obrigatório" })
    .email({ message: "Informe um e-mail válido" }),
  password: z
    .string({ message: "Senha é obrigatória" })
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
});

export type LoginForm = z.infer<typeof loginSchema>;
