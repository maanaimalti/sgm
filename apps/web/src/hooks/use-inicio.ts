"use client";

import { GetAllOrdersFetcher } from "@/data/fetchers/orders/get-all";
import { getAllStockFetcher } from "@/data/fetchers/stock/get-all";
import { statusFor } from "@/lib/stock-status";
import { useQuery } from "@tanstack/react-query";

import { useNotifications } from "./use-notifications";

export const useInicio = () => {
  const pendingQuery = useQuery({
    queryKey: ["orders", "stats", "PENDING"],
    queryFn: () =>
      GetAllOrdersFetcher({ page: 1, pageSize: 1, status: "PENDING" }),
    staleTime: 60_000,
  });

  const recentQuery = useQuery({
    queryKey: ["orders", "recent", 3],
    queryFn: () => GetAllOrdersFetcher({ page: 1, pageSize: 3 }),
    staleTime: 60_000,
  });

  const stockQuery = useQuery({
    queryKey: ["stocks", "alert"],
    queryFn: () => getAllStockFetcher({}),
    staleTime: 60_000,
  });

  const { unreadCount } = useNotifications();

  const stockAlertCount = (stockQuery.data ?? []).reduce((acc, row) => {
    const s = statusFor(row.quantity, row.product.minStock);
    if (s === "low" || s === "critical" || s === "out") return acc + 1;
    return acc;
  }, 0);

  return {
    pendingCount: pendingQuery.data?.total ?? 0,
    pendingLoading: pendingQuery.isLoading,
    stockAlertCount,
    stockLoading: stockQuery.isLoading,
    recentOrders: recentQuery.data?.orders ?? [],
    recentLoading: recentQuery.isLoading,
    unreadCount,
  };
};
