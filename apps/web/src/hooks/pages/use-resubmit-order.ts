import type {
  OrderFormItem,
  OrderFormPickerSelection,
} from "@/components/orders/order-form";
import { useToast } from "@/components/ui/use-toast";
import { GetAllProductsFetcher } from "@/data/fetchers/products/get-all";
import { updateOrderMutation } from "@/data/mutations/update-order";
import type { OrderResponse } from "@sgm/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "../use-debounce";

export const useResubmitOrderPage = (id: string, order?: OrderResponse) => {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [event, setEvent] = useState("");
  const [observation, setObservation] = useState("");
  const [items, setItems] = useState<OrderFormItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [picker, setPicker] = useState<OrderFormPickerSelection | null>(null);
  const [pickerQty, setPickerQty] = useState<number>(0);
  const [productSearch, setProductSearch] = useState("");
  const debouncedSearch = useDebounce(productSearch, 300);

  useEffect(() => {
    if (initialized || !order) return;
    setEvent(order.event ?? "");
    setObservation(order.observation ?? "");
    setItems(
      (order.orderItem ?? []).map((it) => ({
        productId: it.product.id,
        name: it.product.name,
        unit: it.product.unity?.name ?? "",
        category: it.product.category?.name,
        quantity: it.quantity,
      })),
    );
    setInitialized(true);
  }, [order, initialized]);

  const productsQuery = useQuery({
    queryKey: ["products", "picker", debouncedSearch],
    queryFn: () =>
      GetAllProductsFetcher({
        page: 1,
        pageSize: 20,
        search: debouncedSearch,
      }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateOrderMutation(id, {
        event: event.trim(),
        observation: observation.trim() || undefined,
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      }),
    onSuccess: () => {
      toast({ title: "Pedido reenviado para aprovação" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      router.push(`/pedidos/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reenviar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    if (!picker || pickerQty <= 0) return;
    if (items.some((i) => i.productId === picker.productId)) {
      toast({
        title: "Produto já adicionado",
        description: "Edite a quantidade no item existente.",
        variant: "destructive",
      });
      return;
    }
    setItems((prev) => [...prev, { ...picker, quantity: pickerQty }]);
    setPicker(null);
    setPickerQty(0);
    setProductSearch("");
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSubmit = () => {
    if (!event.trim()) {
      toast({ title: "Informe o nome do evento", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Adicione ao menos um item", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  const totals = useMemo(
    () => ({
      itemCount: items.length,
      totalQty: items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    [items],
  );

  return {
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
    products: productsQuery.data?.products ?? [],
    productsLoading: productsQuery.isLoading,
    handleAddItem,
    handleUpdateQuantity,
    handleRemoveItem,
    handleSubmit,
    isSubmitting: mutation.isPending,
    totals,
    goBack: () => router.back(),
  };
};
