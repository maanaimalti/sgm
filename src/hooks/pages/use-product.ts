import { useToast } from "@/components/ui/use-toast";
import { GetAllProductsFetcher } from "@/data/fetchers/products/get-all";
import { deleteProductMutation } from "@/data/mutations/delete-product";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const useProductPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const deleteProduct = useMutation({
    mutationKey: ["delete-product"],
    mutationFn: deleteProductMutation,
    onSuccess: () => {
      toast({
        title: "Produto deletado com sucesso",
        duration: 2000,
      });
      queryClient.invalidateQueries({queryKey: ["products", currentPage]});
    },
    onError: () => {
      toast({
        title: "Erro ao deletar produto",
        description: "Tente novamente mais tarde",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["products", currentPage],
    queryFn: () => GetAllProductsFetcher({ page: currentPage }),
    placeholderData: keepPreviousData
  });

  const handleDeleteProduct = (id: string) => {
    deleteProduct.mutate(id);
  };

  const handleClickNewProduct = () => {
    router.push("/produtos/novo");
  };

  const handleEditProduct = (id: string) => {
    router.push(`/produtos/${id}`);
  };

  return {
    products: data?.products,
    total: data?.total,
    currentPage,
    isLoading,
    deleteIsLoading: deleteProduct.isPending,
    setCurrentPage,
    handleDeleteProduct,
    handleClickNewProduct,
    handleEditProduct,
  };
};