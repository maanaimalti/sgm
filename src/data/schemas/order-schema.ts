import { z } from "zod";

export const orderSchema = z.object({
  items: z.object({
    productId: z.string({ message: "Produto é obrigatório" }),
    quantity: z.number({ message: "Quantidade é obrigatória" }),
  }).array(),
});

export type OrderForm = z.infer<typeof orderSchema>;
