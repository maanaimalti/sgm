import { z } from "zod";

export const orderSchema = z.object({
  event: z
    .string({ required_error: "Nome do evento é obrigatório" })
    .min(1, "Nome do evento é obrigatório"),
  observation: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce
          .number()
          .int()
          .positive("Quantidade inválida"),
      }),
    )
    .min(1, "Adicione ao menos um item"),
});

export type OrderForm = z.infer<typeof orderSchema>;
