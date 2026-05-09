import { z } from "zod";

export const unitSchema = z.object({
  name: z
    .string({ message: "Nome é obrigatório" })
    .min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
  description: z.string().optional(),
});

export const unitWithIdSchema = unitSchema.extend({
  id: z.string(),
});

export type UnitForm = z.infer<typeof unitSchema>;

export type UnitWithIdForm = z.infer<typeof unitWithIdSchema>;
