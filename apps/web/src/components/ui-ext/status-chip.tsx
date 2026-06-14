import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@sgm/shared";

const orderMap: Record<
  OrderStatus,
  {
    variant: "default" | "secondary" | "success" | "warning" | "destructive";
    label: string;
  }
> = {
  PENDING: { variant: "warning", label: "Pendente" },
  APPROVED: { variant: "success", label: "Aprovado" },
  REJECTED: { variant: "destructive", label: "Rejeitado" },
  CANCELED: { variant: "destructive", label: "Cancelado" },
  PURCHASED: { variant: "secondary", label: "Comprado" },
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  const { variant, label } = orderMap[status] ?? {
    variant: "default" as const,
    label: status ?? "—",
  };
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}

type StockStatus = "ok" | "low" | "critical" | "out";

const stockMap: Record<
  StockStatus,
  {
    variant: "default" | "secondary" | "success" | "warning" | "destructive";
    label: string;
  }
> = {
  ok: { variant: "success", label: "Em estoque" },
  low: { variant: "warning", label: "Estoque baixo" },
  critical: { variant: "warning", label: "Crítico" },
  out: { variant: "destructive", label: "Sem estoque" },
};

export function StockStatusChip({ status }: { status: StockStatus }) {
  const { variant, label } = stockMap[status] ?? {
    variant: "default" as const,
    label: status ?? "—",
  };
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
