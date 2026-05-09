import { useToast } from "@/components/ui/use-toast";
import { GetOrderByIdFetcher } from "@/data/fetchers/orders/get-by-id";
import { cancelOrderMutation } from "@/data/mutations/cancel-order";
import { confirmOrderMutation } from "@/data/mutations/confirm-order";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

export const useEditOrderPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ["order", id],
    queryFn: () => GetOrderByIdFetcher(String(id)),
  });

  const cancelOrderMt = useMutation({
    mutationKey: ["cancel-order"],
    mutationFn: () => cancelOrderMutation(String(id)),
    onSuccess: () => {
      toast({
        title: "Pedido cancelado com sucesso",
      });
      router.push("/pedidos");
    },
    onError: () => {
      toast({
        title: "Erro ao cancelar pedido",
        variant: "destructive",
      });
    },
    retry: 3,
  });

  const confirmOrderMt = useMutation({
    mutationKey: ["confirm-order"],
    mutationFn: () => confirmOrderMutation(String(id)),
    onSuccess: () => {
      toast({
        title: "Pedido confirmado com sucesso",
      });
      router.push("/pedidos");
    },
    onError: () => {
      toast({
        title: "Erro ao confirmar pedido",
        variant: "destructive",
      });
    },
    retry: 3,
  });

  const handleCancelOrder = () => {
    cancelOrderMt.mutate();
  };

  const handleConfirmOrder = () => {
    confirmOrderMt.mutate();
  };

  return {
    order: data,
    confirmIsLoading: confirmOrderMt.isPending,
    cancelIsLoading: cancelOrderMt.isPending,
    handleCancelOrder,
    handleConfirmOrder,
  };
};
