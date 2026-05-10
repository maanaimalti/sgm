"use client";

export const dynamic = "force-dynamic";

import {
  AlertTriangle,
  Layers,
  Minus,
  Package,
  Plus,
  Scale,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

import {
  useFAB,
  useMobileHeader,
} from "@/components/shell/mobile-header-context";
import { EmptyState } from "@/components/ui-ext/empty-state";
import { FilterChip } from "@/components/ui-ext/filter-chip";
import { PageHeader } from "@/components/ui-ext/page-header";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { StockStatusChip } from "@/components/ui-ext/status-chip";
import { StockBar } from "@/components/ui-ext/stock-bar";
import { SummaryStat } from "@/components/ui-ext/summary-stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, InputGroup } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useStockPage } from "@/hooks/pages/use-stock";
import { cn } from "@/lib/utils";

const formatRelative = (date: string | Date) => {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days}d`;
};

const formatHHmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const isToday = (d: Date) => {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const COLS =
  "grid grid-cols-[2fr,1fr,1.5fr,1fr,1fr,80px] gap-3 items-center px-4";

const EstoquePageInner = () => {
  const router = useRouter();
  const {
    isLoading,
    rows,
    counts,
    categories,
    q,
    setQ,
    stockFilter,
    setStockFilter,
    category,
    setCategory,
    lastUpdatedAt,
    handleUpdateStock,
  } = useStockPage();

  const visibleRows = category
    ? rows.filter(() => true) // category filter is product-level; backend doesn't expose it on stock; left as a no-op for now
    : rows;

  const updatedTone = lastUpdatedAt && isToday(lastUpdatedAt) ? "default" : "default";
  const updatedValue = lastUpdatedAt
    ? isToday(lastUpdatedAt)
      ? "hoje"
      : "—"
    : "—";
  const updatedHint = lastUpdatedAt && isToday(lastUpdatedAt)
    ? formatHHmm(lastUpdatedAt)
    : undefined;

  const showWarning = counts.lows + counts.outs > 0;
  const showEmpty = !isLoading && visibleRows.length === 0;
  const isMobile = useIsMobile();

  useMobileHeader({
    title: "Estoque",
    search: { value: q, onChange: setQ, placeholder: "Buscar produto…" },
    filters: (
      <>
        <FilterChip active={!stockFilter} onClick={() => setStockFilter("")}>
          Todos
        </FilterChip>
        <FilterChip
          active={stockFilter === "low"}
          count={counts.lows}
          onClick={() => setStockFilter("low")}
        >
          Atenção
        </FilterChip>
        <FilterChip
          active={stockFilter === "out"}
          count={counts.outs}
          onClick={() => setStockFilter("out")}
        >
          Sem estoque
        </FilterChip>
        <FilterChip
          active={stockFilter === "ok"}
          count={counts.oks}
          onClick={() => setStockFilter("ok")}
        >
          OK
        </FilterChip>
      </>
    ),
  });

  useFAB({
    icon: <Scale size={20} />,
    label: "Alterar estoque",
    onClick: handleUpdateStock,
  });

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Operação", "Estoque"]}
        title="Estoque · Cozinha"
        subtitle="Controle de saldo de produtos. Atualizado em tempo real."
        actions={
          <Button size="sm" onClick={handleUpdateStock}>
            <Scale size={14} />
            Alterar estoque
          </Button>
        }
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryStat
            label="Produtos cadastrados"
            value={counts.total}
            hint="cozinha"
          />
          <SummaryStat
            label="Estoque baixo"
            value={counts.lows}
            hint="precisa de atenção"
            tone="warn"
          />
          <SummaryStat
            label="Sem estoque"
            value={counts.outs}
            tone="bad"
          />
          <SummaryStat
            label="Atualizado"
            value={updatedValue}
            hint={updatedHint}
            tone={updatedTone}
          />
        </div>

        {showWarning && (
          <div className="flex items-center gap-3.5 px-4 py-3.5 bg-warn-soft border border-[oklch(0.86_0.07_75)] rounded-3">
            <div className="size-8 rounded-pill bg-warn text-card flex items-center justify-center shrink-0">
              <AlertTriangle size={15} />
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-warn-ink">
                {counts.lows + counts.outs}{" "}
                {counts.lows + counts.outs === 1
                  ? "item precisa"
                  : "itens precisam"}{" "}
                de atenção
              </div>
              <div className="text-[12.5px] text-ink-2 mt-0.5">
                Considere abrir um novo pedido para repor os itens em vermelho
                ou amarelo.
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/pedidos/novo")}
            >
              <Plus size={13} />
              Repor agora
            </Button>
          </div>
        )}

        <div className="hidden md:flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChip active={!stockFilter} onClick={() => setStockFilter("")}>
              Todos
            </FilterChip>
            <FilterChip
              active={stockFilter === "low"}
              count={counts.lows}
              onClick={() => setStockFilter("low")}
            >
              Atenção
            </FilterChip>
            <FilterChip
              active={stockFilter === "out"}
              count={counts.outs}
              onClick={() => setStockFilter("out")}
            >
              Sem estoque
            </FilterChip>
            <FilterChip
              active={stockFilter === "ok"}
              count={counts.oks}
              onClick={() => setStockFilter("ok")}
            >
              OK
            </FilterChip>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[260px]">
              <InputGroup
                leading={<Search size={14} />}
                className="h-9 rounded-pill"
              >
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar produto…"
                />
              </InputGroup>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary">
                  Categoria
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setCategory("")}>
                  Todas
                </DropdownMenuItem>
                {categories.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onSelect={() => setCategory(c.id)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {showEmpty ? (
          rows.length === 0 && counts.total === 0 ? (
            <EmptyState
              icon={Layers}
              title="Nenhum produto no estoque"
              description="Cadastre produtos para começar a controlar o estoque."
              action={
                <Button onClick={() => router.push("/produtos/novo")}>
                  <Plus size={14} />
                  Novo produto
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Nenhum produto encontrado"
              description="Tente outro filtro ou termo de busca."
            />
          )
        ) : isMobile ? (
          <div className="flex flex-col gap-2">
            {visibleRows.map((row) => {
              const minStock = row.product.minStock ?? 0;
              const unit = row.product.unity?.name ?? "";
              return (
                <div
                  key={row.id}
                  className={cn(
                    "bg-card border border-line rounded-3 p-3 shadow-sm-warm",
                    row.status === "out" && "bg-bad-soft",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center size-9 rounded-2 bg-soft text-muted shrink-0">
                      <Package size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink truncate">
                          {row.product.name}
                        </span>
                        <StockStatusChip status={row.status} />
                      </div>
                      <div className="mt-1 text-[12px] text-muted">
                        <span className="text-ink-2 tabular-nums font-medium">
                          {row.quantity}
                        </span>{" "}
                        {unit}
                        {minStock > 0 && (
                          <span className="text-faint ml-1.5">
                            mín {minStock}
                            {unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/estoque/alterar?productId=${row.product.id}&type=in`}
                        aria-label="Adicionar estoque"
                        className="inline-flex items-center justify-center size-9 rounded-pill bg-soft text-ink-2"
                      >
                        <Plus size={16} />
                      </Link>
                      <Link
                        href={`/estoque/alterar?productId=${row.product.id}&type=out`}
                        aria-label="Retirar estoque"
                        className="inline-flex items-center justify-center size-9 rounded-pill bg-soft text-ink-2"
                      >
                        <Minus size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div
              className={cn(
                COLS,
                "py-3 border-b border-line text-[11.5px] uppercase tracking-[0.05em] text-muted font-medium",
              )}
            >
              <div>Produto</div>
              <div>Categoria</div>
              <div>Saldo</div>
              <div>Status</div>
              <div>Atualizado</div>
              <div className="text-right">Ações</div>
            </div>

            {isLoading ? (
              <div className="px-4 py-3 flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={String(i)} className="h-12 rounded-2" />
                ))}
              </div>
            ) : (
              <div>
                {visibleRows.map((row) => {
                  const minStock = row.product.minStock ?? 0;
                  const unit = row.product.unity?.name ?? "";
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        COLS,
                        "py-3 border-b border-line last:border-0",
                        row.status === "out" && "bg-bad-soft/95",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex items-center justify-center size-8 rounded-2 bg-soft text-muted shrink-0">
                          <Package size={15} />
                        </span>
                        <span className="font-medium text-ink truncate">
                          {row.product.name}
                        </span>
                      </div>
                      <div>
                        <Badge variant="default">
                          {row.product.department?.name ?? "—"}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-semibold tabular-nums text-ink">
                            {row.quantity}
                          </span>
                          <span className="text-muted text-xs">{unit}</span>
                          {minStock > 0 && (
                            <span className="text-faint text-[11px] ml-1.5">
                              mín {minStock}
                              {unit}
                            </span>
                          )}
                        </div>
                        {minStock > 0 && (
                          <StockBar
                            qty={row.quantity}
                            threshold={minStock}
                            status={row.status}
                            className="h-1.5"
                          />
                        )}
                      </div>
                      <div>
                        <StockStatusChip status={row.status} />
                      </div>
                      <div className="text-[12.5px] text-muted">
                        {row.updatedAt ? formatRelative(row.updatedAt) : "—"}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/estoque/alterar?productId=${row.product.id}&type=in`}
                          aria-label="Adicionar estoque"
                          className="inline-flex items-center justify-center size-8 rounded-pill text-ink-2 hover:bg-soft"
                        >
                          <Plus size={14} />
                        </Link>
                        <Link
                          href={`/estoque/alterar?productId=${row.product.id}&type=out`}
                          aria-label="Retirar estoque"
                          className="inline-flex items-center justify-center size-8 rounded-pill text-ink-2 hover:bg-soft"
                        >
                          <Minus size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>
    </main>
  );
};

const EstoquePage = () => (
  <Suspense fallback={null}>
    <EstoquePageInner />
  </Suspense>
);

export default EstoquePage;
