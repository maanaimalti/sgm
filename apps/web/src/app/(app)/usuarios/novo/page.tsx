"use client";

import { ROLES, type Role } from "@sgm/shared";
import { ArrowLeft, Check, Info, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { FilterChip } from "@/components/ui-ext/filter-chip";
import { FormSection } from "@/components/ui-ext/form-section";
import { PageHeader } from "@/components/ui-ext/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useNewUser } from "@/hooks/pages/use-new-user";
import { roleLabel } from "@/lib/roles";

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

const NewUserPage = () => {
  const router = useRouter();
  const {
    form,
    departments,
    departmentsIsLoading,
    createUserIsLoading,
    onSubmit,
  } = useNewUser();

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Administração", "Usuários", "Novo usuário"]}
        title="Novo usuário"
        subtitle="A pessoa recebe um e-mail para definir a própria senha."
        actions={
          <Button size="sm" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft size={14} />
            Voltar
          </Button>
        }
      />

      <div className="px-4 md:px-8 py-6">
        <Card className="max-w-[640px] mx-auto p-0 overflow-hidden">
          <Form {...form}>
            <form onSubmit={onSubmit}>
              <div className="px-7">
                <FormSection
                  index={1}
                  title="Identificação"
                  desc="O convite vai para esse endereço, e é com ele que a pessoa entra."
                >
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Maria Silva" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              inputMode="email"
                              autoComplete="off"
                              placeholder="maria@icmalagoas.org.br"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de usuário</FormLabel>
                          <FormControl>
                            <Input placeholder="maria.cozinha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </FormSection>

                <FormSection
                  index={2}
                  title="Permissões"
                  desc="O que essa pessoa enxerga e pode fazer."
                >
                  <div className="grid gap-5">
                    <FormField
                      control={form.control}
                      name="roles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Papéis</FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {ROLES.map((role) => (
                                <FilterChip
                                  key={role}
                                  active={field.value.includes(role)}
                                  onClick={() =>
                                    field.onChange(
                                      toggle(field.value as Role[], role),
                                    )
                                  }
                                >
                                  {roleLabel([role])}
                                </FilterChip>
                              ))}
                            </div>
                          </FormControl>
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
                                    onClick={() =>
                                      field.onChange(
                                        toggle(field.value, department.id),
                                      )
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
                  </div>
                </FormSection>
                <div className="flex items-start gap-2.5 px-3.5 py-3 mb-7 bg-soft rounded-2 text-[12.5px] text-muted leading-[1.5]">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Nenhuma senha é definida aqui. Assim que você criar a conta,
                    o sistema envia um convite por e-mail e a pessoa escolhe a
                    própria senha.
                  </span>
                </div>
              </div>

              <div className="px-7 py-4 border-t border-line bg-surface flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={createUserIsLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUserIsLoading}>
                  {createUserIsLoading ? (
                    <LoaderCircleIcon size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Criar usuário
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </main>
  );
};

export default NewUserPage;
