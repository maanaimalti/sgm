import { useToast } from "@/components/ui/use-toast";
import { GetAllOrdersFetcher } from "@/data/fetchers/orders/get-all";
import { GetOrderReportFetcher } from "@/data/fetchers/orders/get-report-url";
import { generateOrderReportMutation } from "@/data/mutations/generate-order-report";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useJwt } from "../use-jwt";

export const useOrdersPage = () => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingDownload, setIsLoadingDownload] = useState(false);
  const userData = useJwt<UserData>("accessToken");
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["orders", currentPage],
    queryFn: () => GetAllOrdersFetcher({ page: currentPage }),
    placeholderData: keepPreviousData,
  });

  const handleClickNewOrder = () => {
    router.push("/pedidos/novo");
  };

  const handleEditOrder = (id: string) => {
    router.push(`/pedidos/${id}`);
  };

  const handleDownloadOrder = async (id: string) => {
    try {
      setIsLoadingDownload(true);
      const result = await GetOrderReportFetcher(id);
      if (!result) {
        generateOrderReportMutation(id)
          .then(() => {
            toast({
              title: "O PDF está sendo gerado, aguarde alguns instantes.",
              description: "Assim que estiver pronto, você poderá baixá-lo.",
            });
          })
          .catch((error) => {
            toast({
              title: "Erro ao baixar pedido",
              description:
                "Ocorreu um erro ao baixar o pedido, tente novamente.",
              variant: "destructive",
            });
            console.error("Error downloading order:", error);
          });
        return;
      }
      downloadByUrl(result.url, "pedido.pdf");
      return;
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDownload(false);
    }
  };

  const downloadByUrl = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const result = await response.blob();
      const urlItem = window.URL.createObjectURL(new Blob([result]));
      const link = document.createElement("a");
      link.setAttribute("href", urlItem);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  }, []);

  return {
    handleClickNewOrder,
    setCurrentPage,
    handleEditOrder,
    handleDownloadOrder,
    isLoadingDownload,
    isLoading,
    orders: data?.orders,
    currentPage,
    total: data?.total,
    isAdmin: userData?.roles.includes("admin"),
    isManager: userData?.roles.includes("manager"),
    isKitchen: userData?.roles.includes("kitchen"),
    isBuyer: userData?.roles.includes("buyer"),
  };
};

interface UserData {
  username: string;
  sub: string;
  roles: string[];
}
