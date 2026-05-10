export type StockStatus = "ok" | "low" | "critical" | "out";

export function statusFor(
  qty: number,
  minStock?: number | null,
): StockStatus {
  if (qty <= 0) return "out";
  if (!minStock) return "ok";
  if (qty < minStock * 0.5) return "critical";
  if (qty < minStock) return "low";
  return "ok";
}
