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
import { Textarea } from "@/components/ui/textarea";
import { useNewUnit } from "@/hooks/pages/use-new-unit";

const NewUnitPage = () => {
  const router = useRouter();
  const { form, createUnitIsLoading, onSubmit } = useNewUnit();

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Cadastros", "Unidade de medida", "Nova unidade"]}
        title="Nova unidade"
        subtitle="Unidades usadas para medir produtos no estoque e pedidos."
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
                  desc="Nome e símbolo que aparecem em produtos."
                >
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Quilograma" {...field} />
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
                            <Textarea
                              rows={2}
                              placeholder="Símbolo: kg"
                              {...field}
                              value={field.value ?? ""}
                            />
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
                  disabled={createUnitIsLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUnitIsLoading}>
                  {createUnitIsLoading ? (
                    <LoaderCircleIcon size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Salvar unidade
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </main>
  );
};

export default NewUnitPage;
