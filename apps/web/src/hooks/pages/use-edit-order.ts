import { useToast } from "@/components/ui/use-toast";
import { GetOrderByIdFetcher } from "@/data/fetchers/orders/get-by-id";
import {
  GetOrderReportFetcher,
  type OrderReportStatusResponse,
} from "@/data/fetchers/orders/get-report-url";
import { cancelOrderMutation } from "@/data/mutations/cancel-order";
import { confirmOrderMutation } from "@/data/mutations/confirm-order";
import { generateOrderReportMutation } from "@/data/mutations/generate-order-report";
import { rejectOrderMutation } from "@/data/mutations/reject-order";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useJwt } from "../use-jwt";

interface UserData {
  username: string;
  sub: string;
  roles: string[];
}

export const useEditOrderPage = () => {
  const params = useParams();
  const id = String(params?.id ?? "");
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userData = useJwt<UserData>("accessToken");

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => GetOrderByIdFetcher(id),
    enabled: !!id,
  });

  const reportQuery = useQuery({
    queryKey: ["order-report", id],
    queryFn: async (): Promise<OrderReportStatusResponse> => {
      const data = await GetOrderReportFetcher(id);
      return data ?? { status: "none" };
    },
    enabled: !!id,
    refetchInterval: (q) =>
      q.state.data?.status === "processing" ? 3000 : false,
  });

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const confirm = useMutation({
    mutationKey: ["confirm-order", id],
    mutationFn: () => confirmOrderMutation(id),
    onSuccess: () => {
      toast({ title: "Pedido aprovado com sucesso" });
      invalidateOrder();
    },
    onError: () => {
      toast({ title: "Erro ao aprovar pedido", variant: "destructive" });
    },
  });

  const reject = useMutation({
    mutationKey: ["reject-order", id],
    mutationFn: (observation: string) => rejectOrderMutation(id, observation),
    onSuccess: () => {
      toast({ title: "Pedido rejeitado" });
      invalidateOrder();
    },
    onError: () => {
      toast({ title: "Erro ao rejeitar pedido", variant: "destructive" });
    },
  });

  const cancel = useMutation({
    mutationKey: ["cancel-order", id],
    mutationFn: (observation?: string) => cancelOrderMutation(id, observation),
    onSuccess: () => {
      toast({ title: "Pedido cancelado" });
      invalidateOrder();
    },
    onError: () => {
      toast({ title: "Erro ao cancelar pedido", variant: "destructive" });
    },
  });

  const generateReport = useMutation({
    mutationKey: ["generate-order-report", id],
    mutationFn: () => generateOrderReportMutation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-report", id] });
      toast({ title: "Geração do PDF iniciada" });
    },
    onError: () => {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    },
  });

  const reportStatus = reportQuery.data?.status ?? "none";
  const reportUrl =
    reportQuery.data?.status === "ready" ? reportQuery.data.url : undefined;
  const reportStale =
    reportQuery.data?.status === "ready" && reportQuery.data.stale === true;

  return {
    id,
    order: query.data,
    isLoading: query.isLoading,
    confirm,
    reject,
    cancel,
    generateReport,
    reportStatus,
    reportUrl,
    reportStale,
    goBack: () => router.back(),
    currentUserId: userData?.sub,
    isAdmin: userData?.roles.includes("admin") ?? false,
    isManager: userData?.roles.includes("manager") ?? false,
    isBuyer: userData?.roles.includes("buyer") ?? false,
    isKitchen: userData?.roles.includes("kitchen") ?? false,
  };
};
