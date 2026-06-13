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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEditOrderPage } from "@/hooks/pages/use-edit-order";
import type { OrderEvent, OrderEventType } from "@sgm/shared";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Clock,
  Download,
  Loader2,
  type LucideIcon,
  PencilLine,
  RefreshCw,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
  REJECTED: { tone: "bad", icon: XCircle, title: "Pedido rejeitado" },
  RESUBMITTED: { tone: "info", icon: RefreshCw, title: "Pedido reenviado" },
  CANCELED: { tone: "bad", icon: X, title: "Pedido cancelado" },
  PURCHASED: { tone: "info", icon: Truck, title: "Pedido comprado" },
  NOTE: { tone: "info", icon: PencilLine, title: "Nota adicionada" },
};

const OrderDetailPage = () => {
  const {
    id,
    order,
    isLoading,
    confirm,
    reject,
    cancel,
    generateReport,
    reportStatus,
    reportUrl,
    reportStale,
    goBack,
    currentUserId,
    isAdmin,
    isManager,
    isBuyer,
  } = useEditOrderPage();

  const [rejectReason, setRejectReason] = useState("");

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

  const isCreator = order.user.id === currentUserId;
  const isApprover = isAdmin || isManager;
  const canApprove = isApprover && order.status === "PENDING";
  const canDownload = isAdmin || isManager || isBuyer || isCreator;
  const canCreatorCancel =
    isCreator && (order.status === "PENDING" || order.status === "REJECTED");
  const canCreatorEdit = isCreator && order.status === "REJECTED";

  const reportBusy = reportStatus === "processing" || generateReport.isPending;
  const reportReady = reportStatus === "ready" && reportUrl;

  const handleDownload = () => {
    if (reportUrl) window.open(reportUrl, "_blank", "noopener,noreferrer");
  };
  const handleGenerate = () => {
    if (!reportBusy) generateReport.mutate();
  };

  const events = (order.events ?? []) as OrderEvent[];
  const latestEvent = events[events.length - 1];

  const rejectReasonTrimmed = rejectReason.trim();
  const rejectValid =
    rejectReasonTrimmed.length >= 5 && rejectReasonTrimmed.length <= 500;

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
            {canDownload &&
              (reportBusy ? (
                <Button variant="secondary" size="sm" disabled>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Gerando…
                </Button>
              ) : reportReady ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download size={14} className="mr-1.5" />
                    Baixar PDF
                  </Button>
                  {reportStale && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerate}
                      title="O pedido mudou desde a última geração"
                    >
                      <RefreshCw size={14} className="mr-1.5" />
                      Atualizar
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={handleGenerate}>
                  <Download size={14} className="mr-1.5" />
                  Gerar PDF
                </Button>
              ))}
          </>
        }
      />

      {order.status === "REJECTED" && (
        <div className="px-4 md:px-8 pt-4">
          <div className="bg-bad-soft border border-bad-line rounded-3 p-4 flex gap-3 items-start">
            <AlertTriangle size={16} className="text-bad-ink mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-[13.5px] text-ink font-medium">
                Pedido rejeitado
                {order.rejectedBy?.name ? ` por ${order.rejectedBy.name}` : ""}
                {order.rejectedAt
                  ? ` em ${fullDateTime(order.rejectedAt)}`
                  : ""}
              </div>
              {order.statusObservation && (
                <div className="mt-1 text-[12.5px] text-ink-2">
                  <span className="text-muted">Motivo: </span>
                  {order.statusObservation}
                </div>
              )}
              {canCreatorEdit && (
                <div className="mt-3">
                  <Button asChild size="sm">
                    <Link href={`/pedidos/${id}/editar`}>
                      <PencilLine size={14} className="mr-1.5" />
                      Editar pedido
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-5 px-4 md:px-8 py-5">
        <section className="bg-card border border-line rounded-3 shadow-sm-warm overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h2 className="font-serif text-[18px] text-ink">Itens do pedido</h2>
            <span className="text-[12.5px] text-muted">
              {itemCount} itens · {totalQty} unidades
            </span>
          </header>
          <div className="grid grid-cols-[1.6fr,1fr,90px] px-5 py-2.5 text-[11.5px] uppercase tracking-[0.05em] text-muted font-medium border-b border-line">
            <span>Produto</span>
            <span>Categoria</span>
            <span className="text-right">Qtd</span>
          </div>
          <ul>
            {order.orderItem.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[1.6fr,1fr,90px] px-5 py-3 border-b border-line last:border-0 items-center"
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
              </li>
            ))}
          </ul>
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
              {order.approvedBy && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Aprovado por</dt>
                  <dd className="text-ink-2">
                    {order.approvedBy.name}
                    {order.approvedAt
                      ? ` · ${fullDateTime(order.approvedAt)}`
                      : ""}
                  </dd>
                </div>
              )}
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
                const p = eventPresentation[event.type] ?? {
                  tone: "info" as const,
                  icon: PencilLine,
                  title: event.type,
                };
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
                    disabled={
                      cancel.isPending || confirm.isPending || reject.isPending
                    }
                  >
                    <X size={14} className="mr-1.5" />
                    Cancelar
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
                    <AlertDialogAction onClick={() => cancel.mutate(undefined)}>
                      Cancelar pedido
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog
                onOpenChange={(open) => {
                  if (!open) setRejectReason("");
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    disabled={
                      reject.isPending || confirm.isPending || cancel.isPending
                    }
                  >
                    <XCircle size={14} className="mr-1.5" />
                    Rejeitar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rejeitar pedido {code}</AlertDialogTitle>
                    <AlertDialogDescription>
                      Descreva o motivo para que o autor possa ajustar o pedido
                      e reenviar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reject-reason">Motivo da rejeição</Label>
                    <Textarea
                      id="reject-reason"
                      rows={4}
                      placeholder="Ex: Produto indisponível, fora do orçamento, etc."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      maxLength={500}
                    />
                    <div className="text-[11px] text-muted flex justify-between">
                      <span>Mínimo de 5 caracteres.</span>
                      <span>{rejectReasonTrimmed.length}/500</span>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!rejectValid}
                      onClick={() => {
                        if (!rejectValid) return;
                        reject.mutate(rejectReasonTrimmed);
                      }}
                    >
                      Rejeitar pedido
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                size="sm"
                disabled={
                  confirm.isPending || cancel.isPending || reject.isPending
                }
                onClick={() => confirm.mutate()}
              >
                <Check size={14} className="mr-1.5" />
                Aprovar
              </Button>
            </>
          }
        />
      )}

      {!canApprove && canCreatorCancel && (
        <StickyActionBar
          left={
            <span className="text-[13px] text-muted">
              Você pode cancelar este pedido enquanto aguarda aprovação.
            </span>
          }
          right={
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="dangerOutline"
                  size="sm"
                  disabled={cancel.isPending}
                >
                  <X size={14} className="mr-1.5" />
                  Cancelar pedido
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar pedido {code}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel.mutate(undefined)}>
                    Cancelar pedido
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        />
      )}
    </main>
  );
};

export default OrderDetailPage;
