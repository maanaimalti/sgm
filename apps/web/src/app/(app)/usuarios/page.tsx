"use client";

export const dynamic = "force-dynamic";

import { KeyRound, LoaderCircleIcon, Search, Users } from "lucide-react";
import { Suspense } from "react";

import { useMobileHeader } from "@/components/shell/mobile-header-context";
import { TableLoading } from "@/components/table-loading";
import { EmptyState } from "@/components/ui-ext/empty-state";
import { PageHeader } from "@/components/ui-ext/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUsersPage } from "@/hooks/pages/use-users";

const UsersPageInner = () => {
  const {
    users,
    isLoading,
    q,
    setQ,
    form,
    resetTarget,
    openReset,
    closeReset,
    isResetting,
    onSubmitReset,
  } = useUsersPage();

  const showEmpty = !isLoading && users.length === 0;

  useMobileHeader({
    title: "Usuários",
    search: { value: q, onChange: setQ, placeholder: "Buscar usuário…" },
  });

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Administração", "Usuários"]}
        title="Usuários"
        subtitle="Contas com acesso ao sistema. Novas contas ainda são criadas pela equipe técnica."
        search={{ value: q, onChange: setQ, placeholder: "Buscar usuário…" }}
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">
        {showEmpty ? (
          <EmptyState
            icon={q ? Search : Users}
            title={
              q ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"
            }
            description={
              q
                ? "Tente outro termo de busca."
                : "As contas são criadas pela equipe técnica."
            }
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Setores</TableHead>
                  <TableHead className="w-[160px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              {isLoading ? (
                <TableLoading columns={5} />
              ) : (
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-ink">
                        {user.name}
                      </TableCell>
                      <TableCell className="font-mono text-[12.5px] text-ink-2">
                        {user.username}
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="default">
                              {role}
                            </Badge>
                          ))}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px] text-ink-2">
                        {user.departments.map((d) => d.name).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReset(user)}
                        >
                          <KeyRound size={14} className="mr-1.5" />
                          Redefinir senha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </Card>
        )}
      </div>

      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => !open && closeReset()}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {resetTarget?.name}. As sessões abertas
              dessa pessoa serão encerradas na hora.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={onSubmitReset} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="newPassword">Nova senha</FormLabel>
                    <FormControl>
                      <Input
                        id="newPassword"
                        type="text"
                        autoComplete="off"
                        disabled={isResetting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="confirmPassword">
                      Confirmar nova senha
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="confirmPassword"
                        type="text"
                        autoComplete="off"
                        disabled={isResetting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeReset}
                  disabled={isResetting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isResetting}>
                  {isResetting ? (
                    <LoaderCircleIcon className="animate-spin h-4 w-4" />
                  ) : (
                    "Redefinir"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageInner />
    </Suspense>
  );
}
