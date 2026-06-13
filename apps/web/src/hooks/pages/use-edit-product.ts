import { toast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { GetAllDepartmentsFetcher } from "@/data/fetchers/departments/get-all";
import { GetProductByIdFetcher } from "@/data/fetchers/products/get-by-id";
import { getAllStockFetcher } from "@/data/fetchers/stock/get-all";
import { GetAllUnitiesFetcher } from "@/data/fetchers/unities/get-all";
import { updateProductMutation } from "@/data/mutations/update-product";
import { type ProductForm, productSchema } from "@/data/schemas/product-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

export const useEditProductPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const editProductMutation = useMutation({
    mutationFn: (product: ProductForm) =>
      updateProductMutation(product, id as string),
    onSuccess: () => {
      toast({ title: "Produto atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      router.push("/produtos");
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => GetProductByIdFetcher(String(id)),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: GetAllCategoriesFetcher,
  });

  const { data: unities } = useQuery({
    queryKey: ["unities"],
    queryFn: GetAllUnitiesFetcher,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: GetAllDepartmentsFetcher,
  });

  const { data: stocks } = useQuery({
    queryKey: ["stocks"],
    queryFn: () => getAllStockFetcher({}),
  });

  const currentStock = useMemo(() => {
    return stocks?.find((s) => s.product.id === id)?.quantity ?? 0;
  }, [stocks, id]);

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    values: {
      description: product?.description ?? "",
      name: product?.name ?? "",
      brand: product?.brand ?? "",
      category: product?.category?.id ?? "",
      unity: product?.unity?.id ?? "",
      department: product?.department?.id ?? "",
      costValue: product?.costValue ?? 0,
      saleValue: product?.saleValue ?? 0,
      minStock: product?.minStock ?? 0,
      initialStock: 0,
    },
  });

  const onSubmit = (data: ProductForm) => {
    editProductMutation.mutate(data);
  };

  return {
    isLoading: productLoading,
    isSubmitting: editProductMutation.isPending,
    form,
    unities,
    categories,
    product,
    departments,
    currentStock,
    onSubmit,
  };
};
