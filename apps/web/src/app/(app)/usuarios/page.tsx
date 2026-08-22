"use client";

export const dynamic = "force-dynamic";

import { isPlaceholderEmail } from "@sgm/shared";
import {
  AlertTriangle,
  KeyRound,
  LoaderCircleIcon,
  Mail,
  Pencil,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

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
import { EditUserDialog } from "@/components/usuarios/edit-user-dialog";
import { useUsersPage } from "@/hooks/pages/use-users";
import { useRoles } from "@/hooks/use-auth";
import { roleLabel } from "@/lib/roles";

const UsersPageInner = () => {
  const router = useRouter();
  const { isAdmin, isLoading: rolesLoading } = useRoles();
  const {
    users,
    placeholderCount,
    isLoading,
    q,
    setQ,
    form,
    resetTarget,
    openReset,
    closeReset,
    isResetting,
    onSubmitReset,
    emailForm,
    emailTarget,
    openEmail,
    closeEmail,
    isUpdatingEmail,
    onSubmitEmail,
    editTarget,
    openEdit,
    closeEdit,
  } = useUsersPage();

  // Convenience, not security — the API's @Roles("admin") is what actually
  // decides. Without it a non-admin typing the URL gets a broken list with a
  // "Novo usuário" button on it.
  useEffect(() => {
    if (!rolesLoading && !isAdmin) router.replace("/pedidos");
  }, [rolesLoading, isAdmin, router]);

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
        subtitle="Contas com acesso ao sistema."
        search={{ value: q, onChange: setQ, placeholder: "Buscar usuário…" }}
        actions={
          <Button size="sm" asChild>
            <Link href="/usuarios/novo">
              <Plus size={14} />
              Novo usuário
            </Link>
          </Button>
        }
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">
        {placeholderCount > 0 && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-soft border border-line rounded-2 text-[13px] text-ink-2 leading-[1.5]">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              {placeholderCount === 1
                ? "1 usuário ainda usa e-mail provisório"
                : `${placeholderCount} usuários ainda usam e-mail provisório`}
              . Esses endereços não recebem mensagens — troque pelo e-mail real
              de cada pessoa.
            </span>
          </div>
        )}

        {showEmpty ? (
          <EmptyState
            icon={q ? Search : Users}
            title={
              q ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"
            }
            description={
              q
                ? "Tente outro termo de busca."
                : "Use o botão \u201cNovo usuário\u201d para criar a primeira conta."
            }
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Setores</TableHead>
                  <TableHead className="w-[340px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              {isLoading ? (
                <TableLoading columns={6} />
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
                      <TableCell className="text-[13px]">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={
                              isPlaceholderEmail(user.email)
                                ? "text-muted"
                                : "text-ink-2"
                            }
                          >
                            {user.email ?? "—"}
                          </span>
                          {isPlaceholderEmail(user.email) && (
                            <Badge variant="secondary">provisório</Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="default">
                              {roleLabel([role])}
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
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={14} className="mr-1.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEmail(user)}
                        >
                          <Mail size={14} className="mr-1.5" />
                          E-mail
                        </Button>
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

      <Dialog
        open={emailTarget !== null}
        onOpenChange={(open) => !open && closeEmail()}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Trocar e-mail</DialogTitle>
            <DialogDescription>
              O e-mail é com o que {emailTarget?.name} entra no sistema. A troca
              vale no próximo login.
            </DialogDescription>
          </DialogHeader>

          <Form {...emailForm}>
            <form onSubmit={onSubmitEmail} className="flex flex-col gap-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Novo e-mail</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        disabled={isUpdatingEmail}
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
                  onClick={closeEmail}
                  disabled={isUpdatingEmail}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdatingEmail}>
                  {isUpdatingEmail ? (
                    <LoaderCircleIcon className="animate-spin h-4 w-4" />
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <EditUserDialog
        user={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => !open && closeEdit()}
      />
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
