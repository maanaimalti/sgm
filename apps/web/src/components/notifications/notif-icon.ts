import type { NotificationResponse } from "@sgm/shared";
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  Download,
  type LucideIcon,
  X,
} from "lucide-react";

export type NotifTone = "ok" | "warn" | "bad" | "info";

export interface NotifPresentation {
  icon: LucideIcon;
  tone: NotifTone;
  title: string;
  body: string;
  deeplink?: string;
}

export function presentNotification(
  n: Pick<NotificationResponse, "type" | "text" | "metadata">,
): NotifPresentation {
  let meta: Record<string, string> = {};
  try {
    if (n.metadata) meta = JSON.parse(n.metadata) as Record<string, string>;
  } catch {
    meta = {};
  }
  switch (n.type) {
    case "PENDING_ORDER":
      return {
        icon: Clock,
        tone: "warn",
        title: "Pedido aguarda aprovação",
        body: n.text,
        deeplink: meta.orderId ? `/pedidos/${meta.orderId}` : undefined,
      };
    case "ORDER_APPROVED":
      return {
        icon: Check,
        tone: "ok",
        title: "Pedido aprovado",
        body: n.text,
        deeplink: meta.orderId ? `/pedidos/${meta.orderId}` : undefined,
      };
    case "ORDER_CANCELED":
      return {
        icon: X,
        tone: "bad",
        title: "Pedido cancelado",
        body: n.text,
        deeplink: meta.orderId ? `/pedidos/${meta.orderId}` : undefined,
      };
    case "LOW_STOCK":
      return {
        icon: AlertTriangle,
        tone: "bad",
        title: "Estoque baixo",
        body: n.text,
        deeplink: meta.productId
          ? `/estoque?productId=${meta.productId}`
          : "/estoque",
      };
    case "ORDER_REPORT":
    case "REPORT_READY":
      return {
        icon: Download,
        tone: "info",
        title: "Relatório disponível",
        body: n.text,
      };
    case "REPORT_FAILED":
      return {
        icon: AlertTriangle,
        tone: "bad",
        title: "Falha no relatório",
        body: n.text,
      };
    default:
      return { icon: Bell, tone: "info", title: n.text, body: "" };
  }
}
