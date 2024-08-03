import { useToast } from "@/components/ui/use-toast";
import { GetAllUnitiesFetcher } from "@/data/fetchers/unities/get-all";
import { deleteUnitMutation } from "@/data/mutations/delete-unit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const useUnit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const deleteUnit = useMutation({
    mutationKey: ["delete-unit"],
    mutationFn: deleteUnitMutation,
    onSuccess: () => {
      toast({
        title: "Unidade deletada com sucesso",
        duration: 2000,
      });
      queryClient.invalidateQueries({
        queryKey: ["unities"],
      });
    },
    onError: () => {
      toast({
        title: "Erro ao deletar unidade",
        description: "Tente novamente mais tarde",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["unities"],
    queryFn: GetAllUnitiesFetcher,
  });

  const handleDeleteUnit = (id: string) => {
    deleteUnit.mutate(id);
  };

  const handleClickNewUnit = () => {
    router.push("/unidade-de-medida/novo");
  };

  const handleEditUnit = (id: string) => {
    router.push(`/unidade-de-medida/${id}`);
  };

  return {
    unities: data,
    isLoading,
    deleteIsLoading: deleteUnit.isPending,
    handleDeleteUnit,
    handleClickNewUnit,
    handleEditUnit,
  };
};