import { useToast } from "@/components/ui/use-toast";
import { GetAllOrdersFetcher } from "@/data/fetchers/orders/get-all";
import { GetOrderReportFetcher } from "@/data/fetchers/orders/get-report-url";
import { generateOrderReportMutation } from "@/data/mutations/generate-order-report";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { OrderStatus } from "@sgm/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "../use-debounce";
import { useJwt } from "../use-jwt";

const PAGE_SIZE = 10;

export const useOrdersPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userData = useJwt<UserData>("accessToken");
  const { toast } = useToast();

  const urlPage = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const urlStatus = (searchParams.get("status") as OrderStatus | null) ?? null;
  const urlSearch = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [isLoadingDownload, setIsLoadingDownload] = useState(false);

  const updateUrl = useCallback(
    (next: { page?: number; status?: OrderStatus | null; q?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.page !== undefined) {
        if (next.page <= 1) params.delete("page");
        else params.set("page", String(next.page));
      }
      if (next.status !== undefined) {
        if (next.status === null) params.delete("status");
        else params.set("status", next.status);
      }
      if (next.q !== undefined) {
        if (!next.q) params.delete("q");
        else params.set("q", next.q);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    if (debouncedSearch === urlSearch) return;
    updateUrl({ q: debouncedSearch, page: 1 });
  }, [debouncedSearch, urlSearch, updateUrl]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", urlPage, urlStatus, urlSearch],
    queryFn: () =>
      GetAllOrdersFetcher({
        page: urlPage,
        pageSize: PAGE_SIZE,
        status: urlStatus ?? undefined,
        search: urlSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const statKeys: { key: "all" | OrderStatus; status?: OrderStatus }[] = [
    { key: "all" },
    { key: "PENDING", status: "PENDING" },
    { key: "APPROVED", status: "APPROVED" },
    { key: "CANCELED", status: "CANCELED" },
  ];

  const stats = useQuery({
    queryKey: ["orders", "stats"],
    queryFn: async () => {
      const results = await Promise.all(
        statKeys.map(({ status }) =>
          GetAllOrdersFetcher({ page: 1, pageSize: 1, status }),
        ),
      );
      return {
        all: results[0].total,
        PENDING: results[1].total,
        APPROVED: results[2].total,
        CANCELED: results[3].total,
      };
    },
    staleTime: 60_000,
  });

  const handleClickNewOrder = () => router.push("/pedidos/novo");
  const handleEditOrder = (id: string) => router.push(`/pedidos/${id}`);

  const handleDownloadOrder = async (id: string) => {
    try {
      setIsLoadingDownload(true);
      const result = await GetOrderReportFetcher(id);
      if (!result) {
        await generateOrderReportMutation(id);
        toast({
          title: "O PDF está sendo gerado, aguarde alguns instantes.",
          description: "Assim que estiver pronto, você poderá baixá-lo.",
        });
        return;
      }
      await downloadByUrl(result.url, "pedido.pdf");
    } catch (e) {
      toast({
        title: "Erro ao baixar pedido",
        description: "Ocorreu um erro ao baixar o pedido, tente novamente.",
        variant: "destructive",
      });
      console.error(e);
    } finally {
      setIsLoadingDownload(false);
    }
  };

  const downloadByUrl = useCallback(async (url: string, filename: string) => {
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
  }, []);

  const handleSetStatus = (status: OrderStatus | null) => {
    updateUrl({ status, page: 1 });
  };

  const handleSetPage = (page: number) => {
    updateUrl({ page });
  };

  return {
    handleClickNewOrder,
    handleEditOrder,
    handleDownloadOrder,
    handleSetStatus,
    handleSetPage,
    setSearchInput,
    isLoadingDownload,
    isLoading,
    orders: data?.orders,
    total: data?.total ?? 0,
    pageSize: PAGE_SIZE,
    currentPage: urlPage,
    currentStatus: urlStatus,
    searchInput,
    stats: stats.data,
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
