import { toast } from "@/components/ui/use-toast";
import { GetAllProductsFetcher } from "@/data/fetchers/products/get-all";
import { updateStockMutation } from "@/data/mutations/update-stock";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDebounce } from "../use-debounce";

export const useUpdateStock = () => {
  const router = useRouter();
  const [items, setItems] = useState<
    { id: string; quantity: number; name: string; unity: string; type: 'in' | 'out' }[]
  >([]);
  const [currentProduct, setCurrentProduct] = useState<{
    id: string;
    name: string;
    unity: string;
  } | null>(null);
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [productSearchValue, setProductSearchValue] = useState("");
  const debouncedProductSearchValue = useDebounce(productSearchValue, 500);

  const stockMutation = useMutation({
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    mutationFn: (stock: any) => updateStockMutation(stock),
    retry: 3,
    retryDelay: 2000,
    onSuccess: (data) => {
      toast({
        title: "Estoque atualizado com sucesso",
      });
      router.push("/estoque");
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar estoque",
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
        variant: "destructive",
      });
      return;
    }
    setItems((prevProducts) => [
      ...prevProducts,
      { ...currentProduct, quantity: currentQuantity, type: transactionType },
    ]);
    setCurrentProduct(null);
    setCurrentQuantity(0);
  };

  const handleUpdateStock = () => {
    if (!items.length) {
      toast({
        title: "Pedido vazio",
        description: "Adicione produtos ao pedido antes de confirmar",
        variant: "destructive",
      });
      return;
    }
    stockMutation.mutate({
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        type: transactionType,
      })),
    });
  };

  const handleSelectProduct = (productInfo: string) => {
    const [id, name, unity] = productInfo.split("-");
    setCurrentProduct({ id, name, unity });
  };

  const handleSelectTransactionType = (transactionType: 'in' | 'out') => {
    setTransactionType(transactionType);
  }

  const handleRemoveItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  return {
    items,
    products: data?.products,
    currentProduct,
    currentQuantity,
    transactionType,
    handleRemoveItem,
    handleSelectProduct,
    handleAddProduct,
    setCurrentProduct,
    setCurrentQuantity,
    handleUpdateStock,
    setProductSearchValue,
    handleSelectTransactionType,
  };
};
