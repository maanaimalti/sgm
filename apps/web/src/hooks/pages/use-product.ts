import { useToast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { GetAllProductsFetcher } from "@/data/fetchers/products/get-all";
import { getAllStockFetcher } from "@/data/fetchers/stock/get-all";
import { deleteProductMutation } from "@/data/mutations/delete-product";
import { useDebounce } from "@/hooks/use-debounce";
import { type StockStatus, statusFor } from "@/lib/stock-status";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

export const useProductPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const urlQ = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";

  const [q, setQ] = useState(urlQ);
  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    // Bailing out when the URL already matches is what makes it safe to depend
    // on searchParams: without it, our own replace() would retrigger the effect.
    if (debouncedQ === urlQ) return;
    const next = new URLSearchParams(searchParams.toString());
    if (debouncedQ) next.set("q", debouncedQ);
    else next.delete("q");
    next.set("page", "1");
    router.replace(`?${next.toString()}`);
  }, [debouncedQ, urlQ, searchParams, router]);

  const setCategory = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("category", value);
    else next.delete("category");
    next.set("page", "1");
    router.replace(`?${next.toString()}`);
  };

  const setPage = (value: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(value));
    router.replace(`?${next.toString()}`);
  };

  const productsQuery = useQuery({
    queryKey: ["products", { page, q: debouncedQ, category }],
    queryFn: () =>
      GetAllProductsFetcher({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedQ,
        categoryId: category || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: GetAllCategoriesFetcher,
  });

  const stocksQuery = useQuery({
    queryKey: ["stocks"],
    queryFn: () => getAllStockFetcher({}),
  });

  const stockByProductId = useMemo(() => {
    const map = new Map<
      string,
      { quantity: number; status: StockStatus; minStock?: number | null }
    >();
    for (const row of stocksQuery.data ?? []) {
      map.set(row.product.id, {
        quantity: row.quantity,
        minStock: row.product.minStock,
        status: statusFor(row.quantity, row.product.minStock),
      });
    }
    return map;
  }, [stocksQuery.data]);

  const deleteProduct = useMutation({
    mutationKey: ["delete-product"],
    mutationFn: deleteProductMutation,
    onSuccess: () => {
      toast({
        title: "Produto deletado com sucesso",
        duration: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => {
      toast({
        title: "Erro ao deletar produto",
        description: "Tente novamente mais tarde",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  return {
    products: productsQuery.data?.products ?? [],
    total: productsQuery.data?.total ?? 0,
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    refetch: productsQuery.refetch,
    page,
    pageSize: PAGE_SIZE,
    q,
    setQ,
    category,
    setCategory,
    setPage,
    categories: categoriesQuery.data ?? [],
    stockByProductId,
    deleteIsLoading: deleteProduct.isPending,
    handleDeleteProduct: (id: string) => deleteProduct.mutate(id),
    handleClickNewProduct: () => router.push("/produtos/novo"),
    handleEditProduct: (id: string) => router.push(`/produtos/${id}`),
  };
};
