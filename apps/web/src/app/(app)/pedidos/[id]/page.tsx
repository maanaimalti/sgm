"use client";

import { AvatarInitials } from "@/components/ui-ext/avatar-initials";
import { PageHeader } from "@/components/ui-ext/page-header";
import { OrderStatusChip } from "@/components/ui-ext/status-chip";
import { StickyActionBar } from "@/components/ui-ext/sticky-action-bar";
import {
  Timeline,
  TimelineDot,
  TimelineItem,
} from "@/components/ui-ext/timeline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEditOrderPage } from "@/hooks/pages/use-edit-order";
import type { OrderEvent, OrderEventType } from "@sgm/shared";
import {
  Check,
  ChevronLeft,
  Clock,
  Download,
  type LucideIcon,
  PencilLine,
  Truck,
  X,
} from "lucide-react";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function fullDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 2) return "ontem";
  return `há ${Math.floor(diff / 86400)} dias`;
}

const eventPresentation: Record<
  OrderEventType,
  { tone: "info" | "ok" | "bad" | "warn"; icon: LucideIcon; title: string }
> = {
  CREATED: { tone: "info", icon: PencilLine, title: "Pedido criado" },
  APPROVED: { tone: "ok", icon: Check, title: "Pedido aprovado" },
  CANCELED: { tone: "bad", icon: X, title: "Pedido cancelado" },
  PURCHASED: { tone: "info", icon: Truck, title: "Pedido comprado" },
  NOTE: { tone: "info", icon: PencilLine, title: "Nota adicionada" },
};

const EditOrderPage = () => {
  const {
    id,
    order,
    isLoading,
    confirm,
    cancel,
    isDownloading,
    handleDownloadPdf,
    goBack,
    isAdmin,
    isManager,
    isBuyer,
  } = useEditOrderPage();

  if (isLoading || !order) {
    return (
      <main className="flex flex-1 flex-col p-8 text-muted text-[13px]">
        Carregando pedido…
      </main>
    );
  }

  const code = order.friendlyCode ?? `#${order.id.slice(0, 4)}`;
  const itemCount = order.orderItem.length;
  const totalQty = order.orderItem.reduce((sum, i) => sum + i.quantity, 0);
  const total = order.orderItem.reduce(
    (sum, i) => sum + i.quantity * (i.product.costValue ?? 0),
    0,
  );
  const canApprove =
    (isAdmin || isManager) && order.status === "PENDING";
  const canDownload = isAdmin || isManager || isBuyer;

  const events = (order.events ?? []) as OrderEvent[];
  const latestEvent = events[events.length - 1];

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Compras", "Pedidos", code]}
        title={order.event ?? `Pedido ${code}`}
        subtitle={
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[12.5px] text-ink-2 px-2 py-0.5 bg-soft rounded-1.5">
              {code}
            </span>
            <OrderStatusChip status={order.status} />
            <span className="text-muted">
              Criado por {order.user.name} — {relativeTime(order.createdAt)}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ChevronLeft size={14} className="mr-1" />
              Voltar
            </Button>
            {canDownload && (
              <Button
                variant="secondary"
                size="sm"
                disabled={isDownloading}
                onClick={handleDownloadPdf}
              >
                <Download size={14} className="mr-1.5" />
                Baixar PDF
              </Button>
            )}
          </>
        }
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-5 px-4 md:px-8 py-5">
        <section className="bg-card border border-line rounded-3 shadow-sm-warm overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h2 className="font-serif text-[18px] text-ink">
              Itens do pedido
            </h2>
            <span className="text-[12.5px] text-muted">
              {itemCount} itens · {totalQty} unidades
            </span>
          </header>
          <div className="grid grid-cols-[1.6fr,1fr,90px,110px,110px] px-5 py-2.5 text-[11.5px] uppercase tracking-[0.05em] text-muted font-medium border-b border-line">
            <span>Produto</span>
            <span>Categoria</span>
            <span className="text-right">Qtd</span>
            <span className="text-right">Preço un.</span>
            <span className="text-right">Subtotal</span>
          </div>
          <ul>
            {order.orderItem.map((item) => {
              const subtotal = item.quantity * (item.product.costValue ?? 0);
              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[1.6fr,1fr,90px,110px,110px] px-5 py-3 border-b border-line last:border-0 items-center"
                >
                  <span className="text-[13.5px] text-ink font-medium">
                    {item.product.name}
                  </span>
                  <span>
                    {item.product.category?.name ? (
                      <Badge variant="default">
                        {item.product.category.name}
                      </Badge>
                    ) : (
                      <span className="text-faint text-[12px]">—</span>
                    )}
                  </span>
                  <span className="text-right text-[13px] text-ink-2 tabular-nums">
                    {item.quantity} {item.product.unity.name}
                  </span>
                  <span className="text-right text-[13px] text-muted tabular-nums">
                    {item.product.costValue
                      ? currency.format(item.product.costValue)
                      : "—"}
                  </span>
                  <span className="text-right text-[13px] text-ink font-medium tabular-nums">
                    {currency.format(subtotal)}
                  </span>
                </li>
              );
            })}
          </ul>
          <footer className="bg-soft px-5 py-4 flex items-baseline justify-end gap-3">
            <span className="text-[12.5px] text-muted uppercase tracking-[0.05em]">
              Estimativa total
            </span>
            <span className="font-serif text-[22px] text-ink tabular-nums">
              {currency.format(total)}
            </span>
          </footer>
        </section>

        <aside className="flex flex-col gap-5">
          <div className="bg-card border border-line rounded-3 shadow-sm-warm p-[18px]">
            <h3 className="font-serif text-[16px] text-ink mb-3">Detalhes</h3>
            <dl className="flex flex-col gap-3 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Autor</dt>
                <dd className="flex items-center gap-2 text-ink-2">
                  <AvatarInitials name={order.user.name} size={22} />
                  <span>{order.user.name}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Criado em</dt>
                <dd className="text-ink-2">{fullDateTime(order.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Itens</dt>
                <dd className="text-ink-2">{itemCount} produtos</dd>
              </div>
            </dl>
            {order.observation && (
              <div className="mt-3.5 p-3.5 bg-soft rounded-2 text-[12.5px] text-ink-2 leading-[1.5]">
                <div className="text-[11px] text-muted uppercase tracking-[0.06em] mb-1">
                  Observação
                </div>
                {order.observation}
              </div>
            )}
          </div>

          <div className="bg-card border border-line rounded-3 shadow-sm-warm p-[18px]">
            <h3 className="font-serif text-[16px] text-ink mb-3">Histórico</h3>
            <Timeline>
              {order.status === "PENDING" && latestEvent && (
                <TimelineItem
                  dot={<TimelineDot tone="warn" icon={Clock} />}
                  title="Aguardando aprovação"
                  desc={relativeTime(latestEvent.createdAt)}
                  current
                />
              )}
              {[...events].reverse().map((event) => {
                const p = eventPresentation[event.type];
                return (
                  <TimelineItem
                    key={event.id}
                    dot={<TimelineDot tone={p.tone} icon={p.icon} />}
                    title={p.title}
                    desc={`por ${event.user.name} · ${fullDateTime(event.createdAt)}`}
                  />
                );
              })}
            </Timeline>
          </div>
        </aside>
      </div>

      {canApprove && (
        <StickyActionBar
          variant="warning"
          left={
            <span className="text-[13px] text-ink">
              Este pedido aguarda sua aprovação.{" "}
              <span className="text-muted">
                Revise os itens antes de confirmar.
              </span>
            </span>
          }
          right={
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    disabled={cancel.isPending || confirm.isPending}
                  >
                    <X size={14} className="mr-1.5" />
                    Cancelar pedido
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar pedido {code}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O autor do pedido será
                      notificado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancel.mutate(undefined)}
                    >
                      Cancelar pedido
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                size="sm"
                disabled={confirm.isPending || cancel.isPending}
                onClick={() => confirm.mutate()}
              >
                <Check size={14} className="mr-1.5" />
                Aprovar pedido
              </Button>
            </>
          }
        />
      )}
    </main>
  );
};

export default EditOrderPage;
