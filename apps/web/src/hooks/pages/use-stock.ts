import { GetAllCategoriesFetcher } from "@/data/fetchers/categories/get-all";
import { getAllStockFetcher } from "@/data/fetchers/stock/get-all";
import { useDebounce } from "@/hooks/use-debounce";
import { type StockStatus, statusFor } from "@/lib/stock-status";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StockFilter = "" | "low" | "out" | "ok";

export const useStockPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQ = searchParams.get("q") ?? "";
  const stockFilter = (searchParams.get("stock") ?? "") as StockFilter;
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
    router.replace(`?${next.toString()}`);
  }, [debouncedQ, urlQ, searchParams, router]);

  const setStockFilter = (value: StockFilter) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("stock", value);
    else next.delete("stock");
    router.replace(`?${next.toString()}`);
  };

  const setCategory = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("category", value);
    else next.delete("category");
    router.replace(`?${next.toString()}`);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["stocks"],
    queryFn: () => getAllStockFetcher({}),
    placeholderData: keepPreviousData,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: GetAllCategoriesFetcher,
  });

  const rows = useMemo(() => {
    return (data ?? []).map((row) => ({
      ...row,
      status: statusFor(row.quantity, row.product.minStock) as StockStatus,
    }));
  }, [data]);

  const counts = useMemo(() => {
    let lows = 0;
    let outs = 0;
    let oks = 0;
    for (const r of rows) {
      if (r.status === "out") outs++;
      else if (r.status === "low" || r.status === "critical") lows++;
      else oks++;
    }
    return { total: rows.length, lows, outs, oks };
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (debouncedQ) {
      const needle = debouncedQ.toLowerCase();
      result = result.filter((r) =>
        r.product.name.toLowerCase().includes(needle),
      );
    }
    if (stockFilter === "low")
      result = result.filter(
        (r) => r.status === "low" || r.status === "critical",
      );
    else if (stockFilter === "out")
      result = result.filter((r) => r.status === "out");
    else if (stockFilter === "ok")
      result = result.filter((r) => r.status === "ok");
    return result;
  }, [rows, debouncedQ, stockFilter]);

  const lastUpdatedAt = useMemo(() => {
    if (!rows.length) return null;
    return rows.reduce<Date | null>((acc, r) => {
      if (!r.updatedAt) return acc;
      const d = new Date(r.updatedAt);
      if (!acc || d > acc) return d;
      return acc;
    }, null);
  }, [rows]);

  return {
    isLoading,
    rows: filtered,
    counts,
    categories: categories ?? [],
    q,
    setQ,
    stockFilter,
    setStockFilter,
    category,
    setCategory,
    lastUpdatedAt,
    handleUpdateStock: () => router.push("/estoque/alterar"),
  };
};
