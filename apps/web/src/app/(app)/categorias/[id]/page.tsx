"use client";

import { ArrowLeft, Check, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useEditCategory } from "@/hooks/pages/use-edit-category";

const EditCategoryPage = () => {
  const router = useRouter();
  const { editCategoryIsLoading, form, category, isLoading, onSubmit } =
    useEditCategory();

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Cadastros", "Categorias", category?.name ?? "Editar"]}
        title="Editar categoria"
        subtitle="Categorias usadas para classificar produtos."
        actions={
          <Button size="sm" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft size={14} />
            Voltar
          </Button>
        }
      />

      <div className="px-8 py-6">
        <Card className="max-w-[640px] mx-auto p-0 overflow-hidden">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="px-7">
                <FormSection
                  index={1}
                  title="Identificação"
                  desc="Nome e descrição que aparecem em produtos."
                >
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            {isLoading ? (
                              <Skeleton className="h-11 rounded-2" />
                            ) : (
                              <Input placeholder="Ex: Cereais" {...field} />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (opcional)</FormLabel>
                          <FormControl>
                            {isLoading ? (
                              <Skeleton className="h-20 rounded-2" />
                            ) : (
                              <Textarea
                                rows={2}
                                placeholder="Arroz, feijão, trigo"
                                {...field}
                                value={field.value ?? ""}
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </FormSection>
              </div>

              <div className="px-7 py-4 border-t border-line bg-surface flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={editCategoryIsLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={editCategoryIsLoading}>
                  {editCategoryIsLoading ? (
                    <LoaderCircleIcon size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Salvar categoria
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </main>
  );
};

export default EditCategoryPage;
