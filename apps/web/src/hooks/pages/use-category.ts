import { useToast } from "@/components/ui/use-toast";
import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { deleteCategoryMutation } from "@/data/mutations/delete-category";
import { useDebounce } from "@/hooks/use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export const useCategory = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    // Bailing out when the URL already matches is what makes it safe to depend
    // on searchParams: without it, our own replace() would retrigger the effect.
    if (debouncedQ === urlQ) return;
    const next = new URLSearchParams(searchParams.toString());
    if (debouncedQ) next.set("q", debouncedQ);
    else next.delete("q");
    router.replace(`?${next.toString()}`);
  }, [debouncedQ, urlQ, searchParams, router]);

  const deleteCategory = useMutation({
    mutationKey: ["delete-categories"],
    mutationFn: deleteCategoryMutation,
    onSuccess: () => {
      toast({ title: "Categoria deletada com sucesso", duration: 2000 });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => {
      toast({
        title: "Erro ao deletar categoria",
        description: "Tente novamente mais tarde",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: GetAllCategoriesFetcher,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!debouncedQ) return data;
    const needle = debouncedQ.toLowerCase();
    return data.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.description ?? "").toLowerCase().includes(needle),
    );
  }, [data, debouncedQ]);

  return {
    categories: filtered,
    total: data?.length ?? 0,
    isLoading,
    q,
    setQ,
    deleteIsLoading: deleteCategory.isPending,
    handleDeleteCategory: (id: string) => deleteCategory.mutate(id),
    handleClickNewCategory: () => router.push("/categorias/novo"),
    handleEditCategory: (id: string) => router.push(`/categorias/${id}`),
  };
};
