import { z } from "zod";

export const productSchema = z.object({
  name: z.string({ message: "Nome é obrigatório"}),
  description: z.string().optional(),
  quantity: z.string().transform(value => value.toString()).default("1"),
  brandName: z.string({ message: "Marca é obrigatória"}),
  unity: z.string({ message: "Unidade de medida é obrigatória"}),
  category: z.string({ message: "Categoria é obrigatória"}),
});

export type ProductForm = z.infer<typeof productSchema>;
