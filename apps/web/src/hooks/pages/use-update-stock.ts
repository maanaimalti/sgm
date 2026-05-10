import { toast } from "@/components/ui/use-toast";
import { GetAllProductsFetcher } from "@/data/fetchers/products/get-all";
import { updateStockMutation } from "@/data/mutations/update-stock";
import {
  type StockMovementForm,
  stockMovementSchema,
} from "@/data/schemas/stock-movement-schema";
import { useDebounce } from "@/hooks/use-debounce";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export const useUpdateStock = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const initialProductId = searchParams.get("productId") ?? "";
  const initialType =
    (searchParams.get("type") as "in" | "out" | null) ?? "in";

  const [productSearch, setProductSearch] = useState("");
  const debouncedSearch = useDebounce(productSearch, 300);

  const form = useForm<StockMovementForm>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      productId: initialProductId,
      type: initialType,
      quantity: undefined as unknown as number,
    },
  });

  const productsQuery = useQuery({
    queryKey: ["products", { page: 1, q: debouncedSearch, category: "" }],
    queryFn: () =>
      GetAllProductsFetcher({
        page: 1,
        pageSize: 50,
        search: debouncedSearch,
      }),
  });

  const stockMutation = useMutation({
    mutationFn: (data: StockMovementForm) => updateStockMutation(data),
    onSuccess: () => {
      toast({ title: "Estoque atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      router.push("/estoque");
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar estoque",
        description:
          error?.response?.data?.message ?? error?.message ?? "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StockMovementForm) => {
    stockMutation.mutate(data);
  };

  const products = productsQuery.data?.products ?? [];
  const selectedProduct = products.find(
    (p) => p.id === form.watch("productId"),
  );

  return {
    form,
    onSubmit,
    products,
    selectedProduct,
    productSearch,
    setProductSearch,
    isSubmitting: stockMutation.isPending,
  };
};
