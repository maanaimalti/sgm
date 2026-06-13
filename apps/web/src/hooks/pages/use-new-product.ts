import { toast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { GetAllDepartmentsFetcher } from "@/data/fetchers/departments/get-all";
import { GetAllUnitiesFetcher } from "@/data/fetchers/unities/get-all";
import { newProductMutation } from "@/data/mutations/new-product-mutation";
import { type ProductForm, productSchema } from "@/data/schemas/product-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export const useNewProductPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const productMutation = useMutation({
    mutationFn: (product: ProductForm) => newProductMutation(product),
    onSuccess: () => {
      toast({ title: "Produto cadastrado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      router.push("/produtos");
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar produto",
        description: error?.message,
        variant: "destructive",
      });
    },
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

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      description: "",
      category: "",
      unity: "",
      department: "",
      costValue: 0,
      saleValue: 0,
      minStock: undefined,
      initialStock: undefined,
    },
  });

  const onSubmit = (data: ProductForm) => {
    productMutation.mutate(data);
  };

  return {
    form,
    unities,
    categories,
    departments,
    isSubmitting: productMutation.isPending,
    onSubmit,
  };
};
