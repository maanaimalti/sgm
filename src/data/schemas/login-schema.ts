import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string({ message: "Nome de usuário é obrigatório"})
    .min(3, { message: "Nome de usuário deve ter no mínimo 3 caracteres"}),
  password: z
    .string({ message: "Senha é obrigatória"})
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres"}),
});

export type LoginForm = z.infer<typeof loginSchema>;