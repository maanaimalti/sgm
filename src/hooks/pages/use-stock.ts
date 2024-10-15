import { getAllStockFetcher } from "@/data/fetchers/stock/get-all";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const useStockPage = () => {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["stock"],
    queryFn: () => getAllStockFetcher({}),
    placeholderData: keepPreviousData
  });

  const handleUpdateStock = () => {
    router.push("/estoque/alterar");
  };

  return {
    isLoading,
    stock: data?.stock,
    handleUpdateStock
  }
}