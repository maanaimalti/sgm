"use client";

export const dynamic = "force-dynamic";

import {
  EditIcon,
  LoaderCircleIcon,
  MoreHorizontal,
  Plus,
  Ruler,
  Search,
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
import { useUnit } from "@/hooks/pages/use-unit";

const UnitPageInner = () => {
  const {
    unities,
    total,
    isLoading,
    q,
    setQ,
    deleteIsLoading,
    handleClickNewUnit,
    handleDeleteUnit,
    handleEditUnit,
  } = useUnit();

  const showEmpty = !isLoading && unities.length === 0;
  const hasFilters = !!q;

  useMobileHeader({
    title: "Unidades",
    search: { value: q, onChange: setQ, placeholder: "Buscar unidade…" },
  });

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Cadastros", "Unidade de medida"]}
        title="Unidade de medida"
        subtitle="Unidades usadas para medir quantidades de produtos (kg, L, un.)."
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Buscar unidade…",
        }}
        actions={
          <Button size="sm" onClick={handleClickNewUnit}>
            <Plus size={14} />
            Nova unidade
          </Button>
        }
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">
        {showEmpty && !hasFilters ? (
          <EmptyState
            icon={Ruler}
            title="Nenhuma unidade cadastrada"
            description="Adicione unidades para usar nos produtos."
            action={
              <Button onClick={handleClickNewUnit}>
                <Plus size={14} />
                Nova unidade
              </Button>
            }
          />
        ) : showEmpty ? (
          <EmptyState
            icon={Search}
            title="Nenhuma unidade encontrada"
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
                  {unities.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium text-ink">
                        {unit.name}
                      </TableCell>
                      <TableCell className="text-muted">
                        {unit.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Editar unidade"
                            onClick={() => handleEditUnit(unit.id)}
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
                                  Excluir unidade?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Produtos vinculados perderão a unidade.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction asChild>
                                  <Button
                                    variant="destructive"
                                    disabled={deleteIsLoading}
                                    onClick={() => handleDeleteUnit(unit.id)}
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
            Mostrando <span className="text-ink-2">{unities.length}</span> de{" "}
            {total}
          </div>
        )}
      </div>
    </main>
  );
};

const UnitPage = () => (
  <Suspense fallback={null}>
    <UnitPageInner />
  </Suspense>
);

export default UnitPage;
