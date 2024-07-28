import { toast } from "@/components/ui/use-toast";
import { GetAllProductsFetcher } from "@/data/fetchers/products/get-all";
import { newOrderMutation } from "@/data/mutations/new-order";
import { type OrderForm, orderSchema } from "@/data/schemas/order-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export const useNewOrderPage = () => {
  const router = useRouter();
  const [items, setItems] = useState<{id: string, quantity: number, name: string}[]>([]);
  const [currentProduct, setCurrentProduct] = useState<{id: string, name: string} | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState(0);

  const orderMutation = useMutation({
    mutationFn: (order: OrderForm) => newOrderMutation(order),
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

  const { 
    data,
    hasNextPage,
    fetchNextPage,
    status
  } = useInfiniteQuery({
    initialPageParam: 1,
    queryKey: ["products"],
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    getNextPageParam: (lastPage: any, allPages) => lastPage.nextCursor,
    queryFn: ({ pageParam = 1 }) => GetAllProductsFetcher({ page: pageParam }),
  });

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
  });

  const onSubmit = (data: OrderForm) => {
    // productMutation.mutate(data);
  };

  const handleAddProduct = () => {
    if (!currentProduct || !currentQuantity) return;
    if (items.some(item => item.id === currentProduct.id)) {
      toast({
        title: "Produto já adicionado",
        description: "O produto já foi adicionado ao pedido",
        variant: "destructive",
      });
      return;
    };
    setItems(
      prevProducts => [
        ...prevProducts, 
        {...currentProduct, quantity: currentQuantity}
      ]
    );
    setCurrentProduct(null);
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
      items: items.map(item => ({ 
        productId: item.id, quantity: item.quantity 
      })) 
    });
  }

  const handleSelectProduct = (productInfo: string) => {
    const [id, name] = productInfo.split("-");
    setCurrentProduct({ id, name });
  }

  const handleRemoveItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }

  return {
    form,
    items,
    products: data?.pages.flatMap(page => page.products),
    currentProduct,
    currentQuantity,
    hasNextPage,
    handleRemoveItem,
    onSubmit,
    handleSelectProduct,
    handleAddProduct,
    setCurrentProduct,
    fetchNextPage,
    setCurrentQuantity,
    handleConfirmOrder,
  };
};