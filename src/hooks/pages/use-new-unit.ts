import { useToast } from "@/components/ui/use-toast";
import { newUnitMutation } from "@/data/mutations/new-unit";
import { categorySchema } from "@/data/schemas/category-schema";
import type { UnitForm } from "@/data/schemas/unit-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";

export const useNewUnit = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const createUnitMutation = useMutation({
    mutationKey: 'create-unit',
    mutationFn: newUnitMutation,
    onError: () => {
      toast({
        title: "Erro ao criar unidade de medida",
        description: "Tente novamente mais tarde",
        duration: 2000,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Unidade de medida criada com sucesso",
        duration: 5000,
      });
      queryClient.invalidateQueries("unities");
      router.push('/unidade-de-medida');
    },
  });

  const form = useForm<UnitForm>({
    resolver: zodResolver(categorySchema),
  });

  const onSubmit = (data: UnitForm) => {
    createUnitMutation.mutate(data);
  };

  return {
    form,
    createUnitIsLoading: createUnitMutation.isLoading,
    onSubmit
  };
};