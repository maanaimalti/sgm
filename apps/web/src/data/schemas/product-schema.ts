import { z } from "zod";

export const productSchema = z.object({
  name: z
    .string({ message: "Nome é obrigatório" })
    .min(1, "Nome é obrigatório"),
  brand: z
    .string({ message: "Marca é obrigatória" })
    .min(1, "Marca é obrigatória"),
  description: z.string().optional(),
  unity: z.string({ message: "Unidade de medida é obrigatória" }),
  category: z.string({ message: "Categoria é obrigatória" }),
  department: z.string({ message: "Setor é obrigatório" }),
  costValue: z.coerce.number().nonnegative().optional(),
  saleValue: z.coerce.number().nonnegative().optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  initialStock: z.coerce.number().int().nonnegative().optional(),
});

export const productUpdateSchema = z
  .object({
    id: z.string({ message: "ID é obrigatório" }),
  })
  .merge(productSchema.partial({ initialStock: true }));

export type ProductForm = z.infer<typeof productSchema>;
