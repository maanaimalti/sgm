import { toast } from "@/components/ui/use-toast";
import { GetAllProductsFetcher } from "@/data/fetchers/products/get-all";
import { newOrderMutation } from "@/data/mutations/new-order";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebounce } from "../use-debounce";

export const useNewOrderPage = () => {
  const router = useRouter();
  const [items, setItems] = useState<
    { id: string; quantity: number; name: string; unity: string }[]
  >([]);
  const [currentProduct, setCurrentProduct] = useState<{
    id: string;
    name: string;
    unity: string;
  } | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [currentEventName, setCurrentEventName] = useState("");
  const [currentObservation, setCurrentObservation] = useState("");
  const [productSearchValue, setProductSearchValue] = useState("");
  // const [debouncedProductSearchValue, setDebouncedProductSearchValue] = useState("");
  const debouncedProductSearchValue = useDebounce(productSearchValue, 500);

  const orderMutation = useMutation({
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    mutationFn: (order: any) => newOrderMutation(order),
    retry: 3,
    retryDelay: 2000,
    onSuccess: (data) => {
      toast({
        title: "Pedido cadastrado com sucesso",
      });
      router.push("/pedidos");
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    onError: (error: any) => {
      toast({
        title: "Erro ao pedido pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data } = useQuery({
    queryKey: ["products", productSearchValue],
    queryFn: () =>
      GetAllProductsFetcher({
        page: 1,
        pageSize: 900,
        search: debouncedProductSearchValue,
      }),
  });

  const handleAddProduct = () => {
    if (!currentProduct || !currentQuantity) return;
    if (items.some((item) => item.id === currentProduct.id)) {
      toast({
        title: "Produto já adicionado",
        description: "O produto já foi adicionado ao pedido",
        variant: "destructive",
      });
      return;
    }
    setItems((prevProducts) => [
      ...prevProducts,
      { ...currentProduct, quantity: currentQuantity },
    ]);
    setCurrentProduct(null);
    setProductSearchValue("");
    setCurrentQuantity(0);
  };

  const handleConfirmOrder = () => {
    if (!items.length) {
      toast({
        title: "Pedido vazio",
        description: "Adicione produtos ao pedido antes de confirmar",
        variant: "destructive",
      });
      return;
    }
    orderMutation.mutate({
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      eventName: currentEventName,
      observation: currentObservation,
    });
  };

  const handleSelectProduct = (productInfo: string) => {
    const [id, name, unity] = productInfo.split("-");
    setCurrentProduct({ id, name, unity });
  };

  const handleRemoveItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  useEffect(() => {
    console.log({ productSearchValue });
  }, [productSearchValue]);

  return {
    items,
    products: data?.products,
    currentProduct,
    currentQuantity,
    currentEventName,
    currentObservation,
    setCurrentObservation,
    setCurrentEventName,
    handleRemoveItem,
    handleSelectProduct,
    handleAddProduct,
    setCurrentProduct,
    setCurrentQuantity,
    handleConfirmOrder,
    setProductSearchValue,
  };
};
