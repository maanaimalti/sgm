import { useToast } from "@/components/ui/use-toast";
import { GetUnitByIdFetcher } from "@/data/fetchers/unities/get-by-id";
import { updateUnitMutation } from "@/data/mutations/update-unit";
import type { CategoryWithIdForm } from "@/data/schemas/category-schema";
import { type UnitWithIdForm, unitSchema } from "@/data/schemas/unit-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export const useEditUnit = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const unitQuery = useQuery({
    queryKey: ["unit", id],
    queryFn: () => GetUnitByIdFetcher(String(id)),
  });

  const editCategoryMutation = useMutation({
    mutationKey: ["edit-unit"],
    mutationFn: updateUnitMutation,
    onError: () => {
      toast({
        title: "Erro ao editar unidade de medida",
        description: "Tente novamente mais tarde",
        duration: 2000,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Unidade de medida atualizada com sucesso",
        duration: 5000,
      });
      queryClient.invalidateQueries({queryKey: ["unities"]});
      router.push("/unidade-de-medida");
    },
  });

  const form = useForm<UnitWithIdForm>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      id: unitQuery.data?.id ?? "",
      name: unitQuery.data?.name ?? "",
      description: unitQuery.data?.description ?? "",
    },
    values: {
      id: unitQuery.data?.id ?? "",
      name: unitQuery.data?.name ?? "",
      description: unitQuery.data?.description || undefined,
    }
  });

  const onSubmit = (data: CategoryWithIdForm) => {
    const { id: _, ...rest } = data;
    editCategoryMutation.mutate({...rest, id: String(id)});
  };

  return {
    unit: unitQuery.data,
    isLoading: unitQuery.isLoading,
    form,
    editUnitIsLoading: editCategoryMutation.isPending,
    onSubmit,
  };
}