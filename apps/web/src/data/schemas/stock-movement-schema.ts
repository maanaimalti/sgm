import { z } from "zod";

export const stockMovementSchema = z.object({
  productId: z.string({ required_error: "Selecione um produto" }).min(1, "Selecione um produto"),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero"),
});

export type StockMovementForm = z.infer<typeof stockMovementSchema>;
