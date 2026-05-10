import { useToast } from "@/components/ui/use-toast";
import { GetOrderByIdFetcher } from "@/data/fetchers/orders/get-by-id";
import { GetOrderReportFetcher } from "@/data/fetchers/orders/get-report-url";
import { cancelOrderMutation } from "@/data/mutations/cancel-order";
import { confirmOrderMutation } from "@/data/mutations/confirm-order";
import { generateOrderReportMutation } from "@/data/mutations/generate-order-report";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
  const [isDownloading, setIsDownloading] = useState(false);

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => GetOrderByIdFetcher(id),
    enabled: !!id,
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

  const downloadByUrl = async (url: string, filename: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    setIsDownloading(true);
    try {
      let report = await GetOrderReportFetcher(id);
      if (!report) {
        await generateOrderReportMutation(id);
        toast({
          title: "O PDF está sendo gerado",
          description: "Aguarde alguns instantes e tente novamente.",
        });
        return;
      }
      await downloadByUrl(report.url, `pedido-${id}.pdf`);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro ao baixar pedido",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    id,
    order: query.data,
    isLoading: query.isLoading,
    confirm,
    cancel,
    isDownloading,
    handleDownloadPdf,
    goBack: () => router.back(),
    isAdmin: userData?.roles.includes("admin"),
    isManager: userData?.roles.includes("manager"),
    isBuyer: userData?.roles.includes("buyer"),
  };
};
