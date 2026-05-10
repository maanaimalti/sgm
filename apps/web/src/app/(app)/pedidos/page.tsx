"use client";

import { Suspense } from "react";
import { useFAB, useMobileHeader } from "@/components/shell/mobile-header-context";
import { TableLoading } from "@/components/table-loading";
import { AvatarInitials } from "@/components/ui-ext/avatar-initials";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { EmptyState } from "@/components/ui-ext/empty-state";
import { FilterChip } from "@/components/ui-ext/filter-chip";
import { PageHeader } from "@/components/ui-ext/page-header";
import { OrderStatusChip } from "@/components/ui-ext/status-chip";
import { SummaryStat } from "@/components/ui-ext/summary-stat";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrdersPage } from "@/hooks/pages/use-orders";
import type { OrderListItem, OrderStatus } from "@sgm/shared";
import {
  ChevronRight,
  Download,
  Inbox,
  LoaderCircle,
  Plus,
} from "lucide-react";

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  CANCELED: "Cancelado",
  PURCHASED: "Comprado",
};

function formatDateParts(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return { date, time };
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 2) return "ontem";
  return `há ${Math.floor(diff / 86400)} dias`;
}

const PedidosPageContent = () => {
  const {
    handleClickNewOrder,
    handleEditOrder,
    handleDownloadOrder,
    handleSetStatus,
    handleSetPage,
    setSearchInput,
    isLoadingDownload,
    isLoading,
    orders,
    total,
    pageSize,
    currentPage,
    currentStatus,
    searchInput,
    stats,
    isAdmin,
    isKitchen,
    isManager,
    isBuyer,
  } = useOrdersPage();

  const canCreate = !!(isKitchen || isAdmin);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isMobile = useIsMobile();

  useMobileHeader({
    title: "Pedidos",
    search: {
      value: searchInput,
      onChange: setSearchInput,
      placeholder: "Buscar por evento ou código…",
    },
    filters: (
      <>
        <FilterChip
          active={currentStatus === null}
          count={stats?.all}
          onClick={() => handleSetStatus(null)}
        >
          Todos
        </FilterChip>
        <FilterChip
          active={currentStatus === "PENDING"}
          count={stats?.PENDING}
          onClick={() => handleSetStatus("PENDING")}
        >
          Pendentes
        </FilterChip>
        <FilterChip
          active={currentStatus === "APPROVED"}
          count={stats?.APPROVED}
          onClick={() => handleSetStatus("APPROVED")}
        >
          Aprovados
        </FilterChip>
        <FilterChip
          active={currentStatus === "CANCELED"}
          count={stats?.CANCELED}
          onClick={() => handleSetStatus("CANCELED")}
        >
          Cancelados
        </FilterChip>
      </>
    ),
  });

  useFAB(
    canCreate
      ? {
          icon: <Plus size={20} />,
          label: "Novo pedido",
          onClick: handleClickNewOrder,
        }
      : null,
  );

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Compras", "Pedidos"]}
        title="Pedidos"
        subtitle="Acompanhe pedidos das equipes e aprove os que estão aguardando."
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: "Buscar por evento ou código…",
        }}
        actions={
          canCreate ? (
            <Button onClick={handleClickNewOrder} size="sm">
              <Plus size={14} className="mr-1.5" />
              Novo pedido
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-5 px-4 md:px-8 py-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryStat
            label="Aguardando aprovação"
            value={stats?.PENDING ?? "—"}
            tone="warn"
          />
          <SummaryStat label="Aprovados" value={stats?.APPROVED ?? "—"} />
          <SummaryStat label="Cancelados" value={stats?.CANCELED ?? "—"} tone="bad" />
          <SummaryStat label="Total de pedidos" value={stats?.all ?? "—"} />
        </div>

        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <FilterChip
            active={currentStatus === null}
            count={stats?.all}
            onClick={() => handleSetStatus(null)}
          >
            Todos
          </FilterChip>
          <FilterChip
            active={currentStatus === "PENDING"}
            count={stats?.PENDING}
            onClick={() => handleSetStatus("PENDING")}
          >
            Pendentes
          </FilterChip>
          <FilterChip
            active={currentStatus === "APPROVED"}
            count={stats?.APPROVED}
            onClick={() => handleSetStatus("APPROVED")}
          >
            Aprovados
          </FilterChip>
          <FilterChip
            active={currentStatus === "CANCELED"}
            count={stats?.CANCELED}
            onClick={() => handleSetStatus("CANCELED")}
          >
            Cancelados
          </FilterChip>
        </div>

        {isMobile ? (
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="text-[13px] text-muted">Carregando…</div>
            ) : orders && orders.length > 0 ? (
              orders.map((order: OrderListItem) => {
                const code =
                  order.friendlyCode ?? `#${order.id.slice(0, 4)}`;
                const { date } = formatDateParts(order.createdAt);
                return (
                  <button
                    type="button"
                    key={order.id}
                    onClick={() => handleEditOrder(order.id)}
                    className="text-left bg-card border border-line rounded-3 p-3 shadow-sm-warm"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[12.5px] text-ink-2 font-medium">
                        {code}
                      </span>
                      <span className="text-[11.5px] text-muted">{date}</span>
                    </div>
                    <div className="text-[14px] text-ink font-medium truncate">
                      {order.event ?? "—"}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <OrderStatusChip status={order.status} />
                      <div className="flex items-center gap-1.5 text-[12px] text-muted">
                        <AvatarInitials name={order.user.name} size={20} />
                        <span className="truncate max-w-[120px]">
                          {order.user.name}
                        </span>
                        <span className="text-faint">·</span>
                        <span>{order.itemCount ?? 0} itens</span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState
                icon={Inbox}
                title="Nenhum pedido ainda"
                description="Crie um novo pedido para começar."
              />
            )}
          </div>
        ) : (
        <div className="bg-card border border-line rounded-3 shadow-sm-warm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <TableLoading />
            ) : orders && orders.length > 0 ? (
              <TableBody>
                {orders.map((order: OrderListItem) => {
                  const code =
                    order.friendlyCode ?? `#${order.id.slice(0, 4)}`;
                  const { date, time } = formatDateParts(order.createdAt);
                  return (
                    <TableRow
                      key={order.id}
                      onClick={() => handleEditOrder(order.id)}
                      className="cursor-pointer hover:bg-soft"
                    >
                      <TableCell>
                        <span className="font-mono text-[13px] text-ink-2 font-medium">
                          {code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[13.5px] text-ink font-medium truncate max-w-[220px]">
                            {order.event ?? "—"}
                          </span>
                          <span className="text-[11.5px] text-muted">
                            {relativeTime(order.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AvatarInitials name={order.user.name} size={26} />
                          <span className="text-[13px] text-ink-2">
                            {order.user.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[13px] text-ink-2">{date}</span>
                          <span className="text-[11.5px] text-muted">
                            {time}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderStatusChip status={order.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-ink-2">
                          {order.itemCount ?? 0} itens
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {(isAdmin || isManager || isBuyer) &&
                            order.status === "APPROVED" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Baixar PDF"
                                disabled={isLoadingDownload}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadOrder(order.id);
                                }}
                              >
                                {isLoadingDownload ? (
                                  <LoaderCircle
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Download size={15} />
                                )}
                              </Button>
                            )}
                          <ChevronRight size={15} className="text-faint" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            ) : (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <div className="p-6">
                      <EmptyState
                        icon={Inbox}
                        title={statusLabels[currentStatus ?? "PENDING"] && currentStatus
                          ? `Nenhum pedido ${statusLabels[currentStatus].toLowerCase()}`
                          : "Nenhum pedido ainda"}
                        description="Crie um novo pedido para começar."
                        action={
                          canCreate ? (
                            <Button onClick={handleClickNewOrder} size="sm">
                              <Plus size={14} className="mr-1.5" />
                              Novo pedido
                            </Button>
                          ) : undefined
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-[12.5px] text-muted">
            Mostrando {orders?.length ?? 0} de {total} pedidos
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handleSetPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button variant="ghost" size="sm" disabled className="text-ink">
              {currentPage}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handleSetPage(currentPage + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

const PedidosPage = () => (
  <Suspense fallback={null}>
    <PedidosPageContent />
  </Suspense>
);

export default PedidosPage;
