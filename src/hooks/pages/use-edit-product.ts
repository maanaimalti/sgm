import { toast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { GetAllDepartmentsFetcher } from "@/data/fetchers/departments/get-all";
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
    mutationFn: (product: ProductForm) => updateProductMutation(product, id as string),
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

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: GetAllDepartmentsFetcher,
  });

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      description: product?.description ?? "",
      name: product?.name ?? "",
      category: product?.category.id ?? "",
      department: product?.department.id ?? "",
    },
    values: {
      description: product?.description ?? "",
      name: product?.name ?? "",
      category: product?.category.id ?? "",
      unity: product?.unity.id ?? "",
      department: product?.department.id ?? "",
      costValue: product?.productValues.costValue ?? 0,
      saleValue: product?.productValues.saleValue ?? 0,
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
    departments,
    onSubmit
  }
}