"use client";

export const dynamic = "force-dynamic";

import { ArrowLeft, Check, ChevronsUpDown, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";

import { FilterChip } from "@/components/ui-ext/filter-chip";
import { FormSection } from "@/components/ui-ext/form-section";
import { PageHeader } from "@/components/ui-ext/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input, InputGroup } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateStock } from "@/hooks/pages/use-update-stock";

const UpdateStockPageInner = () => {
  const router = useRouter();
  const {
    form,
    onSubmit,
    products,
    selectedProduct,
    productSearch,
    setProductSearch,
    isSubmitting,
  } = useUpdateStock();

  const [pickerOpen, setPickerOpen] = useState(false);
  const type = form.watch("type");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Operação", "Estoque", "Alterar estoque"]}
        title="Alterar estoque"
        subtitle="Registre uma entrada ou saída de produtos."
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
                  title="Movimentação"
                  desc="Selecione o tipo e os itens da movimentação."
                >
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <div className="flex gap-2">
                            <FilterChip
                              type="button"
                              active={type === "in"}
                              onClick={() => field.onChange("in")}
                            >
                              Entrada
                            </FilterChip>
                            <FilterChip
                              type="button"
                              active={type === "out"}
                              onClick={() => field.onChange("out")}
                            >
                              Saída
                            </FilterChip>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produto</FormLabel>
                          <Popover
                            open={pickerOpen}
                            onOpenChange={setPickerOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between h-11 rounded-2 px-3 font-normal"
                                >
                                  <span
                                    className={
                                      selectedProduct ? "text-ink" : "text-muted"
                                    }
                                  >
                                    {selectedProduct?.name ??
                                      "Pesquisar produto…"}
                                  </span>
                                  <ChevronsUpDown
                                    size={14}
                                    className="text-muted"
                                  />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className="p-0 w-[--radix-popover-trigger-width]"
                            >
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Pesquisar produto…"
                                  value={productSearch}
                                  onValueChange={setProductSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    Nenhum produto encontrado.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {products.map((p) => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.id}
                                        onSelect={() => {
                                          field.onChange(p.id);
                                          setPickerOpen(false);
                                        }}
                                      >
                                        {p.name}
                                        <span className="ml-auto text-muted text-[12px]">
                                          {p.unity?.name}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade</FormLabel>
                          <FormControl>
                            <InputGroup suffix={selectedProduct?.unity?.name}>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                  )
                                }
                              />
                            </InputGroup>
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
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <LoaderCircleIcon size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Registrar
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </main>
  );
};

const UpdateStockPage = () => (
  <Suspense fallback={null}>
    <UpdateStockPageInner />
  </Suspense>
);

export default UpdateStockPage;
