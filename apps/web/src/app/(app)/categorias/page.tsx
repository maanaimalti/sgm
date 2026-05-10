"use client";

export const dynamic = "force-dynamic";

import {
  EditIcon,
  LoaderCircleIcon,
  MoreHorizontal,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { Suspense } from "react";

import { useMobileHeader } from "@/components/shell/mobile-header-context";
import { TableLoading } from "@/components/table-loading";
import { EmptyState } from "@/components/ui-ext/empty-state";
import { PageHeader } from "@/components/ui-ext/page-header";
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
import { useCategory } from "@/hooks/pages/use-category";

const CategoriesPageInner = () => {
  const {
    categories,
    total,
    isLoading,
    q,
    setQ,
    deleteIsLoading,
    handleDeleteCategory,
    handleClickNewCategory,
    handleEditCategory,
  } = useCategory();

  const showEmpty = !isLoading && categories.length === 0;

  useMobileHeader({
    title: "Categorias",
    search: { value: q, onChange: setQ, placeholder: "Buscar categoria…" },
  });
  const hasFilters = !!q;

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Cadastros", "Categorias"]}
        title="Categorias"
        subtitle="Categorias usadas para classificar produtos."
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Buscar categoria…",
        }}
        actions={
          <Button size="sm" onClick={handleClickNewCategory}>
            <Plus size={14} />
            Nova categoria
          </Button>
        }
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">
        {showEmpty && !hasFilters ? (
          <EmptyState
            icon={Tag}
            title="Nenhuma categoria"
            description="Crie a primeira categoria para classificar produtos."
            action={
              <Button onClick={handleClickNewCategory}>
                <Plus size={14} />
                Nova categoria
              </Button>
            }
          />
        ) : showEmpty ? (
          <EmptyState
            icon={Search}
            title="Nenhuma categoria encontrada"
            description="Tente outro termo de busca."
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              {isLoading ? (
                <TableLoading columns={3} />
              ) : (
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium text-ink">
                        {category.name}
                      </TableCell>
                      <TableCell className="text-muted">
                        {category.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Editar categoria"
                            onClick={() => handleEditCategory(category.id)}
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
                                  Excluir categoria?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Produtos vinculados perderão a categoria.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction asChild>
                                  <Button
                                    variant="destructive"
                                    disabled={deleteIsLoading}
                                    onClick={() =>
                                      handleDeleteCategory(category.id)
                                    }
                                  >
                                    {deleteIsLoading ? (
                                      <LoaderCircleIcon
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : null}
                                    Excluir
                                  </Button>
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </Card>
        )}

        {!showEmpty && (
          <div className="text-[12.5px] text-muted">
            Mostrando <span className="text-ink-2">{categories.length}</span> de{" "}
            {total}
          </div>
        )}
      </div>
    </main>
  );
};

const CategoriesPage = () => (
  <Suspense fallback={null}>
    <CategoriesPageInner />
  </Suspense>
);

export default CategoriesPage;
