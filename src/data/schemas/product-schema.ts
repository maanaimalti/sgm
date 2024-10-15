import { z } from "zod";

export const productSchema = z.object({
  name: z.string({ message: "Nome é obrigatório" }),
  description: z.string().optional(),
  unity: z.string({ message: "Unidade de medida é obrigatória" }),
  category: z.string({ message: "Categoria é obrigatória" }),
  department: z.string({ message: "Setor é obrigatório" }),
  costValue: z.number({ message: "Preço de compra é obrigatório" }),
  saleValue: z.number().optional(),
});

export const productUpdateSchema = z.object({
  id: z.string({ message: "ID é obrigatório" }),
}).merge(productSchema);

export type ProductForm = z.infer<typeof productSchema>;
