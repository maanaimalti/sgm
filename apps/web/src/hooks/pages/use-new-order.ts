import { useToast } from "@/components/ui/use-toast";
import { GetAllProductsFetcher } from "@/data/fetchers/products/get-all";
import { newOrderMutation } from "@/data/mutations/new-order";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useDebounce } from "../use-debounce";

export interface StagedItem {
  productId: string;
  name: string;
  unit: string;
  category?: string;
  quantity: number;
}

export interface PickerSelection {
  productId: string;
  name: string;
  unit: string;
  category?: string;
}

export const useNewOrderPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [event, setEvent] = useState("");
  const [observation, setObservation] = useState("");
  const [items, setItems] = useState<StagedItem[]>([]);

  const [picker, setPicker] = useState<PickerSelection | null>(null);
  const [pickerQty, setPickerQty] = useState<number>(0);
  const [productSearch, setProductSearch] = useState("");
  const debouncedSearch = useDebounce(productSearch, 300);

  const productsQuery = useQuery({
    queryKey: ["products", "picker", debouncedSearch],
    queryFn: () =>
      GetAllProductsFetcher({
        page: 1,
        pageSize: 20,
        search: debouncedSearch,
      }),
  });

  const orderMutation = useMutation({
    mutationFn: newOrderMutation,
    onSuccess: (data) => {
      toast({ title: "Pedido criado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data?.id) {
        router.push(`/pedidos/${data.id}`);
      } else {
        router.push("/pedidos");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar pedido",
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
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSubmit = () => {
    if (!event.trim()) {
      toast({
        title: "Informe o nome do evento",
        variant: "destructive",
      });
      return;
    }
    if (items.length === 0) {
      toast({
        title: "Adicione ao menos um item",
        variant: "destructive",
      });
      return;
    }
    orderMutation.mutate({
      event: event.trim(),
      observation: observation.trim() || undefined,
      items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    });
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
    isSubmitting: orderMutation.isPending,
    totals,
    goBack: () => router.back(),
  };
};
