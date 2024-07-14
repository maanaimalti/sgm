import { useToast } from "@/components/ui/use-toast";
import { newCategoryMutation } from "@/data/mutations/new-category";
import { categorySchema, type CategoryForm } from "@/data/schemas/category-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";

export const useNewCategory = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const createCategoryMutation = useMutation({
    mutationKey: 'create-category',
    mutationFn: newCategoryMutation,
    onError: () => {
      toast({
        title: "Erro ao criar categoria",
        description: "Tente novamente mais tarde",
        duration: 2000,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Categoria criada com sucesso",
        duration: 5000,
      });
      queryClient.invalidateQueries("categories");
      router.push('/categorias');
    },
  });

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  });

  const onSubmit = (data: CategoryForm) => {
    createCategoryMutation.mutate(data);
  };

  return {
    form,
    createCategoryIsLoading: createCategoryMutation.isLoading,
    onSubmit
  };
};