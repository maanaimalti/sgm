import { toast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { GetProductByIdFetcher } from "@/data/fetchers/products/get-by-id";
import { GetAllUnitiesFetcher } from "@/data/fetchers/unities/get-all";
import { updateProductMutation } from "@/data/mutations/update-product";
import { type ProductForm, productSchema } from "@/data/schemas/product-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export const useEditProductPage = () => {
  const router = useRouter();
  const {id} = useParams();

  const editProductMutation = useMutation({
    mutationFn: (product: ProductForm) => updateProductMutation(product),
    retry: 3,
    retryDelay: 2000,
    onSuccess: (data) => {
      toast({
        title: "Produto atualizado com sucesso",
      });
      router.push("/produtos");
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: product } = useQuery({
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

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      brandName: product?.brandName ?? "",
      description: product?.description ?? "",
      name: product?.name ?? "",
      category: product?.category.id ?? "",
    },
    values: {
      brandName: product?.brandName ?? "",
      description: product?.description ?? "",
      name: product?.name ?? "",
      category: product?.category.id ?? "",
      quantity: product?.quantity.toString() ?? '1',
      unity: product?.unity.id ?? "",
    }
  });

  const onSubmit = (data: ProductForm) => {
    editProductMutation.mutate(data);
  };

  return {
    form,
    unities,
    categories,
    product,
    onSubmit
  }
}