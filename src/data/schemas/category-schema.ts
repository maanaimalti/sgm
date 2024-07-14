import { z } from "zod";

export const categorySchema = z.object({
  name: z.string({ message: "Nome é obrigatório"}).min(3, { message: "Nome deve ter no mínimo 3 caracteres"}),
  description: z.string().optional(),
});

export const categoryWithIdSchema = categorySchema.extend({
  id: z.string(),
});

export type CategoryForm = z.infer<typeof categorySchema>;

export type CategoryWithIdForm = z.infer<typeof categoryWithIdSchema>;