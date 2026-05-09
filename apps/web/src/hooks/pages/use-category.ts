import { useToast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { deleteCategoryMutation } from "@/data/mutations/delete-category";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const useCategory = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteCategory = useMutation({
    mutationKey: ["delete-categories"],
    mutationFn: deleteCategoryMutation,
    onSuccess: () => {
      toast({
        title: "Categoria deletada com sucesso",
        duration: 2000,
      });
      queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
    },
    onError: () => {
      toast({
        title: "Erro ao deletar categoria",
        description: "Tente novamente mais tarde",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: GetAllCategoriesFetcher,
  });

  const handleDeleteCategory = (id: string) => {
    deleteCategory.mutate(id);
  };

  const handleClickNewCategory = () => {
    router.push("/categorias/novo");
  };

  const handleEditCategory = (id: string) => {
    router.push(`/categorias/${id}`);
  };

  return {
    categories: data,
    isLoading,
    deleteIsLoading: deleteCategory.isPending,
    handleDeleteCategory,
    handleClickNewCategory,
    handleEditCategory,
  };
};
