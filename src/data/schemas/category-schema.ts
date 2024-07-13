import { z } from "zod";

export const categorySchema = z.object({
  name: z.string({ message: "Nome é obrigatório"}).min(3, { message: "Nome deve ter no mínimo 3 caracteres"}),
  description: z.string().optional(),
});

export type CategoryForm = z.infer<typeof categorySchema>;