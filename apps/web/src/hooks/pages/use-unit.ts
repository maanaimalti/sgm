import { useToast } from "@/components/ui/use-toast";
import { GetAllUnitiesFetcher } from "@/data/fetchers/unities/get-all";
import { deleteUnitMutation } from "@/data/mutations/delete-unit";
import { useDebounce } from "@/hooks/use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export const useUnit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
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

  const deleteUnit = useMutation({
    mutationKey: ["delete-unit"],
    mutationFn: deleteUnitMutation,
    onSuccess: () => {
      toast({ title: "Unidade deletada com sucesso", duration: 2000 });
      queryClient.invalidateQueries({ queryKey: ["unities"] });
    },
    onError: () => {
      toast({
        title: "Erro ao deletar unidade",
        description: "Tente novamente mais tarde",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["unities"],
    queryFn: GetAllUnitiesFetcher,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!debouncedQ) return data;
    const needle = debouncedQ.toLowerCase();
    return data.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        (u.description ?? "").toLowerCase().includes(needle),
    );
  }, [data, debouncedQ]);

  return {
    unities: filtered,
    total: data?.length ?? 0,
    isLoading,
    q,
    setQ,
    deleteIsLoading: deleteUnit.isPending,
    handleDeleteUnit: (id: string) => deleteUnit.mutate(id),
    handleClickNewUnit: () => router.push("/unidade-de-medida/novo"),
    handleEditUnit: (id: string) => router.push(`/unidade-de-medida/${id}`),
  };
};
