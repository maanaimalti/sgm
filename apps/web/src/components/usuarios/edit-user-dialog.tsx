"use client";

import { ROLES, type Role, type UserListItem } from "@sgm/shared";
import { LoaderCircleIcon } from "lucide-react";

import { FilterChip } from "@/components/ui-ext/filter-chip";
import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditUser } from "@/hooks/pages/use-edit-user";
import { roleLabel } from "@/lib/roles";

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

interface EditUserDialogProps {
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const {
    form,
    departments,
    departmentsIsLoading,
    isEditingSelf,
    editUserIsLoading,
    onSubmit,
  } = useEditUser(user, () => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Nome, papéis e setores de {user?.name}. Para trocar o e-mail, use a
            ação “E-mail”.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name">Nome</FormLabel>
                  <FormControl>
                    <Input id="name" disabled={editUserIsLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="username"
                className="text-[13px] font-medium text-ink-2"
              >
                Nome de usuário
              </Label>
              <Input
                id="username"
                value={user?.username ?? ""}
                disabled
                readOnly
              />
              <p className="text-[12px] text-muted">
                Não pode ser alterado. O login é feito pelo e-mail.
              </p>
            </div>

            <FormField
              control={form.control}
              name="roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papéis</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {ROLES.map((role) => {
                        const locked = isEditingSelf && role === "admin";
                        return (
                          <FilterChip
                            key={role}
                            active={field.value.includes(role)}
                            disabled={locked || editUserIsLoading}
                            className={
                              locked ? "opacity-60 cursor-not-allowed" : ""
                            }
                            onClick={() =>
                              field.onChange(
                                toggle(field.value as Role[], role),
                              )
                            }
                          >
                            {roleLabel([role])}
                          </FilterChip>
                        );
                      })}
                    </div>
                  </FormControl>
                  {isEditingSelf && (
                    <FormDescription>
                      Você não pode remover o seu próprio papel de
                      administrador.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departmentIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setores</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {departmentsIsLoading ? (
                        <span className="text-[13px] text-muted">
                          Carregando setores…
                        </span>
                      ) : (
                        departments.map((department) => (
                          <FilterChip
                            key={department.id}
                            active={field.value.includes(department.id)}
                            disabled={editUserIsLoading}
                            onClick={() =>
                              field.onChange(toggle(field.value, department.id))
                            }
                          >
                            {department.name}
                          </FilterChip>
                        ))
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={editUserIsLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editUserIsLoading}>
                {editUserIsLoading ? (
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
  );
}
