import { useToast } from "@/components/ui/use-toast";
import { GetCategoryByIdFetcher } from "@/data/fetchers/categories/get-by-id";
import { updateCategoryMutation } from "@/data/mutations/update-category";
import { categorySchema, type CategoryWithIdForm } from "@/data/schemas/category-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "react-query";

export const useEditCategory = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const categoryQuery = useQuery({
    queryKey: ["category", id],
    queryFn: () => GetCategoryByIdFetcher(String(id)),
  });

  const editCategoryMutation = useMutation({
    mutationKey: "edit-category",
    mutationFn: updateCategoryMutation,
    onError: () => {
      toast({
        title: "Erro ao editar categoria",
        description: "Tente novamente mais tarde",
        duration: 2000,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Categoria atualizada com sucesso",
        duration: 5000,
      });
      queryClient.invalidateQueries("categories");
      router.push("/categorias");
    },
  });

  const form = useForm<CategoryWithIdForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      id: categoryQuery.data?.id ?? "",
      name: categoryQuery.data?.name ?? "",
      description: categoryQuery.data?.description ?? "",
    },
    values: {
      id: categoryQuery.data?.id ?? "",
      name: categoryQuery.data?.name ?? "",
      description: categoryQuery.data?.description || undefined,
    }
  });

  const onSubmit = (data: CategoryWithIdForm) => {
    const { id: _, ...rest } = data;
    editCategoryMutation.mutate({...rest, id: String(id)});
  };

  return {
    category: categoryQuery.data,
    isLoading: categoryQuery.isLoading,
    form,
    editCategoryIsLoading: editCategoryMutation.isLoading,
    onSubmit,
  };
}