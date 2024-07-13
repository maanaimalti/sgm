import { toast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { GetAllUnitiesFetcher } from "@/data/fetchers/unities/get-all";
import { newProductMutation } from "@/data/mutations/new-product-mutation";
import { productSchema, type ProductForm } from "@/data/schemas/product-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "react-query";

export const useProductPage = () => {
  const router = useRouter();

  const productMutation = useMutation({
    mutationFn: (product: ProductForm) => newProductMutation(product),
    retry: 3,
    retryDelay: 2000,
    onSuccess: () => {
      toast({
        title: "Produto cadastrado com sucesso",
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

  const { data: categories } = useQuery({
    queryKey: "categories",
    queryFn: GetAllCategoriesFetcher,
    onError: (error) => {
      console.log({ error });
    }
  });

  const { data: unities } = useQuery({
    queryKey: "unities",
    queryFn: GetAllUnitiesFetcher,
    onError: (error) => {
      console.log({ error });
    }
  });

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const onSubmit = (data: ProductForm) => {
    productMutation.mutate(data);
  };

  return {
    form,
    unities,
    categories,
    onSubmit
  }
}