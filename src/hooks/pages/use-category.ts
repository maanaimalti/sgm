import { useToast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { deleteCategoryMutation } from "@/data/mutations/delete-category";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "react-query";

export const useCategory = () => {
  const { toast } = useToast();
  const router = useRouter();
  const deleteCategory = useMutation({
    mutationKey: "delete-categories",
    mutationFn: deleteCategoryMutation,
    onSuccess: () => {
      toast({
        title: "Categoria deletada com sucesso",
        duration: 2000,
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
  })

  const { data, isLoading } = useQuery({
    queryKey: "categories",
    queryFn: GetAllCategoriesFetcher,
  });

  const handleDeleteCategory = (id: string) => {
    deleteCategory.mutate(id);
  }

  const handleClickNewCategory = () => {
    router.push("/categorias/novo");
  }

  const handleEditCategory = (id: string) => {
    router.push(`/categorias/${id}`);
  };

  return {
    categories: data,
    isLoading,
    deleteIsLoading: deleteCategory.isLoading,
    handleDeleteCategory,
    handleClickNewCategory,
    handleEditCategory,
  };
}