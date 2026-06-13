import { createHash } from "node:crypto";

/**
 * The minimal slice of an order whose changes should invalidate a cached PDF.
 * Anything that visibly appears in the report (status, event, observation,
 * approval, and the item list) feeds the signature.
 */
export type OrderSignatureInput = {
  status: string;
  event?: string | null;
  observation?: string | null;
  approvedById?: string | null;
  orderItem: Array<{ productId: string; quantity: number }>;
};

/**
 * Deterministic content fingerprint for an order. Two orders with the same
 * visible content produce the same signature, so a cached report can be served
 * as-is; any change flips the signature and marks the report stale.
 */
export function computeOrderSignature(order: OrderSignatureInput): string {
  const items = [...order.orderItem]
    .map((i) => ({ productId: i.productId, quantity: i.quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  const canonical = JSON.stringify({
    status: order.status,
    event: order.event ?? null,
    observation: order.observation ?? null,
    approvedById: order.approvedById ?? null,
    items,
  });

  return createHash("sha1").update(canonical).digest("hex");
}
