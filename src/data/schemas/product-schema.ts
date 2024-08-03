import { z } from "zod";

export const productSchema = z.object({
  name: z.string({ message: "Nome é obrigatório"}),
  description: z.string().optional(),
  unity: z.string({ message: "Unidade de medida é obrigatória"}),
  category: z.string({ message: "Categoria é obrigatória"}),
});

export const productUpdateSchema = z.object({
  id: z.string({ message: "ID é obrigatório" }),
}).merge(productSchema);

export type ProductForm = z.infer<typeof productSchema>;
