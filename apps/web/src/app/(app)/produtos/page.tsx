"use client";

export const dynamic = "force-dynamic";

import {
  ChevronLeft,
  ChevronRight,
  EditIcon,
  LoaderCircleIcon,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  TrashIcon,
} from "lucide-react";
import { Suspense } from "react";

import {
  useFAB,
  useMobileHeader,
} from "@/components/shell/mobile-header-context";
import { TableLoading } from "@/components/table-loading";
import { EmptyState } from "@/components/ui-ext/empty-state";
import { FilterChip } from "@/components/ui-ext/filter-chip";
import { PageHeader } from "@/components/ui-ext/page-header";
import { StockStatusChip } from "@/components/ui-ext/status-chip";
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
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProductPage } from "@/hooks/pages/use-product";
import { useSidebar } from "@/hooks/pages/use-sidebar";
import { useIsMobile } from "@/hooks/use-is-mobile";

const ProductsPageInner = () => {
  const {
    deleteIsLoading,
    handleClickNewProduct,
    handleDeleteProduct,
    handleEditProduct,
    isLoading,
    isError,
    refetch,
    products,
    total,
    page,
    pageSize,
    q,
    setQ,
    category,
    setCategory,
    setPage,
    categories,
    stockByProductId,
  } = useProductPage();

  const showingCount = products.length;
  const hasFilters = !!q || !!category;
  const showEmpty = !isLoading && total === 0;
  const isMobile = useIsMobile();
  const { isKitchen, isAdmin } = useSidebar();
  const canCreate = !!(isKitchen || isAdmin);

  useMobileHeader({
    title: "Produtos",
    search: { value: q, onChange: setQ, placeholder: "Buscar produto…" },
    filters: (
      <>
        <FilterChip active={!category} onClick={() => setCategory("")}>
          Todos
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            active={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.name}
          </FilterChip>
        ))}
      </>
    ),
  });

  useFAB(
    canCreate
      ? {
          icon: <Plus size={20} />,
          label: "Novo produto",
          onClick: handleClickNewProduct,
        }
      : null,
  );

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Cadastros", "Produtos"]}
        title="Produtos"
        subtitle="Catálogo de produtos disponíveis para pedidos e movimentação de estoque."
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Buscar produto…",
        }}
        actions={
          <Button size="sm" onClick={handleClickNewProduct}>
            <Plus size={14} />
            Novo produto
          </Button>
        }
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">
        <div className="hidden md:flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChip active={!category} onClick={() => setCategory("")}>
              Todos
            </FilterChip>
            {categories.map((c) => (
              <FilterChip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
              >
                {c.name}
              </FilterChip>
            ))}
          </div>
        </div>

        {isError ? (
          <div className="border border-dashed border-line-2 rounded-3 bg-card px-6 py-10 text-center">
            <h3 className="font-serif text-[18px] text-ink">
              Não foi possível carregar
            </h3>
            <p className="mt-1.5 text-[13px] text-muted">
              Verifique sua conexão e tente novamente.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-4"
              onClick={() => refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : showEmpty && !hasFilters ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado"
            description="Adicione produtos ao catálogo para usá-los em pedidos e estoque."
            action={
              <Button onClick={handleClickNewProduct}>
                <Plus size={14} />
                Novo produto
              </Button>
            }
          />
        ) : showEmpty ? (
          <EmptyState
            icon={Search}
            title="Nenhum produto encontrado"
            description="Tente outra categoria ou termo de busca."
          />
        ) : isMobile ? (
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="text-[13px] text-muted">Carregando…</div>
            ) : (
              products.map((product) => {
                const stock = stockByProductId.get(product.id);
                const status = stock?.status ?? "out";
                const qty = stock?.quantity ?? 0;
                return (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => handleEditProduct(product.id)}
                    className="text-left bg-card border border-line rounded-3 p-3 shadow-sm-warm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center size-9 rounded-2 bg-soft text-muted shrink-0">
                        <Package size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] text-ink font-medium truncate">
                            {product.name}
                          </span>
                          <StockStatusChip status={status} />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
                          <span className="truncate">
                            {product.category?.name ?? "—"}
                          </span>
                          <span className="text-faint">·</span>
                          <span className="tabular-nums">
                            {qty} {product.unity?.name ?? ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Em estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              {isLoading ? (
                <TableLoading columns={6} />
              ) : (
                <TableBody>
                  {products.map((product) => {
                    const stock = stockByProductId.get(product.id);
                    const status = stock?.status ?? "out";
                    const qty = stock?.quantity ?? 0;
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center size-8 rounded-2 bg-soft text-muted shrink-0">
                              <Package size={15} />
                            </span>
                            <span className="font-medium text-ink">
                              {product.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {product.category?.name ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted">
                          {product.unity?.name ?? "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {qty} {product.unity?.name ?? ""}
                        </TableCell>
                        <TableCell>
                          <StockStatusChip status={status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Editar produto"
                              onClick={() => handleEditProduct(product.id)}
                            >
                              <EditIcon size={14} />
                            </Button>
                            <AlertDialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Mais ações"
                                  >
                                    <MoreHorizontal size={14} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      className="text-bad-ink"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      Excluir
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Excluir produto?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction asChild>
                                    <Button
                                      variant="destructive"
                                      disabled={deleteIsLoading}
                                      onClick={() =>
                                        handleDeleteProduct(product.id)
                                      }
                                    >
                                      {deleteIsLoading ? (
                                        <LoaderCircleIcon
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <TrashIcon size={14} />
                                      )}
                                      Excluir
                                    </Button>
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </Card>
        )}

        {!showEmpty && (
          <div className="flex items-center justify-between mt-2 text-[12.5px] text-muted">
            <div>
              Mostrando <span className="text-ink-2">{showingCount}</span> de{" "}
              {total} produtos
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={13} />
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page * pageSize >= total}
                onClick={() => setPage(page + 1)}
              >
                Próximo
                <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

const ProductsPage = () => (
  <Suspense fallback={null}>
    <ProductsPageInner />
  </Suspense>
);

export default ProductsPage;
