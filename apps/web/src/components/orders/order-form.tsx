"use client";

import { FormSection } from "@/components/ui-ext/form-section";
import { StickyActionBar } from "@/components/ui-ext/sticky-action-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ChevronsUpDown,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const numberFmt = new Intl.NumberFormat("pt-BR");

export type OrderFormItem = {
  productId: string;
  name: string;
  unit: string;
  category?: string;
  quantity: number;
};

export type OrderFormPickerSelection = {
  productId: string;
  name: string;
  unit: string;
  category?: string;
};

type ProductOption = {
  id: string;
  name: string;
  category?: { name?: string } | null;
  unity?: { name?: string } | null;
};

export type OrderFormProps = {
  event: string;
  setEvent: (v: string) => void;
  observation: string;
  setObservation: (v: string) => void;
  items: OrderFormItem[];
  picker: OrderFormPickerSelection | null;
  setPicker: (v: OrderFormPickerSelection | null) => void;
  pickerQty: number;
  setPickerQty: (v: number) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  products: ProductOption[];
  productsLoading: boolean;
  handleAddItem: () => void;
  handleUpdateQuantity: (productId: string, quantity: number) => void;
  handleRemoveItem: (productId: string) => void;
  handleSubmit: () => void;
  isSubmitting: boolean;
  totals: { itemCount: number; totalQty: number };
  submitLabel: string;
};

export const OrderForm = ({
  event,
  setEvent,
  observation,
  setObservation,
  items,
  picker,
  setPicker,
  pickerQty,
  setPickerQty,
  productSearch,
  setProductSearch,
  products,
  productsLoading,
  handleAddItem,
  handleUpdateQuantity,
  handleRemoveItem,
  handleSubmit,
  isSubmitting,
  totals,
  submitLabel,
}: OrderFormProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="flex-1 px-4 md:px-8 py-5">
        <div className="max-w-[940px] mx-auto bg-card border border-line rounded-3 shadow-sm-warm px-6 md:px-8">
          <FormSection
            index="1"
            title="Detalhes do pedido"
            desc="Informações para identificar o evento."
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event">Nome do evento</Label>
                <Input
                  id="event"
                  placeholder="Seminário de principiantes"
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                />
                <p className="text-[11.5px] text-muted">
                  Ex: Seminário de principiantes, Encontro de jovens, Vigília…
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="observation">
                  Observação{" "}
                  <span className="text-muted font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="observation"
                  rows={3}
                  placeholder="Notas para a equipe de compras…"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            index="2"
            title="Itens"
            desc="Adicione produtos e ajuste as quantidades."
          >
            <div className="flex flex-col gap-3">
              <div className="bg-surface border border-dashed border-line-2 rounded-3 p-3.5">
                <div className="grid grid-cols-1 md:grid-cols-[1.7fr,1fr,auto] gap-2.5 items-end">
                  <div className="flex flex-col gap-1.5">
                    <Label>Produto</Label>
                    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          // biome-ignore lint/a11y/useSemanticElements: combobox via Popover
                          role="combobox"
                          className="justify-between h-11"
                        >
                          <span className="truncate">
                            {picker?.name ?? "Selecione o produto"}
                          </span>
                          <ChevronsUpDown
                            size={14}
                            className="ml-2 opacity-60 shrink-0"
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[min(420px,calc(100vw-1.5rem))]">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar produto…"
                            value={productSearch}
                            onValueChange={setProductSearch}
                          />
                          <CommandList>
                            {productsLoading ? (
                              <div className="py-6 flex items-center justify-center text-muted">
                                <Loader2
                                  size={16}
                                  className="animate-spin mr-2"
                                />
                                Carregando…
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>
                                  Nenhum produto encontrado.
                                </CommandEmpty>
                                <CommandGroup>
                                  {products.map((p) => (
                                    <CommandItem
                                      key={p.id}
                                      value={p.id}
                                      onSelect={() => {
                                        setPicker({
                                          productId: p.id,
                                          name: p.name,
                                          unit: p.unity?.name ?? "",
                                          category: p.category?.name,
                                        });
                                        setPickerOpen(false);
                                      }}
                                      className="flex items-center justify-between gap-3"
                                    >
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[13.5px] text-ink font-medium truncate">
                                          {p.name}
                                        </span>
                                        {p.category?.name && (
                                          <span className="text-[11.5px] text-muted truncate">
                                            {p.category.name}
                                          </span>
                                        )}
                                      </div>
                                      {p.unity?.name && (
                                        <Badge variant="default">
                                          {p.unity.name}
                                        </Badge>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="qty">Quantidade</Label>
                    <Input
                      id="qty"
                      type="number"
                      min={1}
                      placeholder="0"
                      value={pickerQty || ""}
                      onChange={(e) =>
                        setPickerQty(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!picker || pickerQty <= 0}
                    className="h-11"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="px-6 py-9 text-center border border-dashed border-line-2 rounded-3 text-muted text-[13.5px]">
                  Nenhum item adicionado ainda. Use o seletor acima para
                  começar.
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li
                      key={item.productId}
                      className="flex items-center gap-2 px-3 py-2.5 bg-card border border-line rounded-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium text-ink truncate">
                          {item.name}
                        </div>
                        <div className="text-[11.5px] text-muted mt-0.5 truncate">
                          {[item.category, item.unit]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end shrink-0">
                        <button
                          type="button"
                          aria-label="Diminuir"
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                          className="size-7 rounded-1.5 border border-line-2 bg-card inline-flex items-center justify-center hover:bg-soft"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              item.productId,
                              Number(e.target.value),
                            )
                          }
                          className={cn(
                            // 16px on mobile avoids iOS zoom-on-focus; 13px on >=md.
                            "w-12 h-7 text-center border border-line-2 rounded-1.5 bg-surface text-[16px] md:text-[13px] tabular-nums focus-visible:outline-none focus-visible:border-brand",
                          )}
                        />
                        <button
                          type="button"
                          aria-label="Aumentar"
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                          className="size-7 rounded-1.5 border border-line-2 bg-card inline-flex items-center justify-center hover:bg-soft"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="Remover"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-bad-ink size-8 shrink-0 inline-flex items-center justify-center rounded-1.5 hover:bg-bad-soft"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormSection>
        </div>
      </div>

      <StickyActionBar
        left={
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[10.5px] uppercase tracking-[0.05em] text-muted">
                Itens
              </span>
              <span className="font-serif text-[22px] text-ink leading-none tabular-nums">
                {totals.itemCount}
              </span>
            </div>
            <span className="w-px h-7 bg-line" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[10.5px] uppercase tracking-[0.05em] text-muted">
                Quantidade total
              </span>
              <span className="font-serif text-[22px] text-ink leading-none tabular-nums">
                {numberFmt.format(totals.totalQty)}
              </span>
            </div>
          </div>
        }
        right={
          <Button
            size="lg"
            disabled={items.length === 0 || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                {submitLabel}
                <ArrowRight size={14} className="ml-1.5" />
              </>
            )}
          </Button>
        }
      />
    </>
  );
};
