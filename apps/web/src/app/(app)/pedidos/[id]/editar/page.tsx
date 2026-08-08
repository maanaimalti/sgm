"use client";

import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/ui-ext/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { GetOrderByIdFetcher } from "@/data/fetchers/orders/get-by-id";
import { useResubmitOrderPage } from "@/hooks/pages/use-resubmit-order";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

const EditOrderPage = () => {
  const params = useParams();
  const id = String(params?.id ?? "");
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => GetOrderByIdFetcher(id),
    enabled: !!id,
  });

  const form = useResubmitOrderPage(id, orderQuery.data);

  useEffect(() => {
    if (!orderQuery.data || !user) return;
    const isCreator = orderQuery.data.user.id === user.id;
    const isRejected = orderQuery.data.status === "REJECTED";
    if (!isCreator || !isRejected) {
      toast({
        title: "Este pedido não pode mais ser editado.",
        variant: "destructive",
      });
      router.replace(`/pedidos/${id}`);
    }
  }, [orderQuery.data, user, id, router, toast]);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Compras", "Pedidos", "Editar pedido"]}
        title={`Editar pedido ${orderQuery.data?.friendlyCode ?? ""}`.trim()}
        subtitle="Ajuste os itens e reenvie o pedido para aprovação."
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ChevronLeft size={14} className="mr-1" />
            Voltar
          </Button>
        }
      />
      {orderQuery.isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted">
          <Loader2 size={16} className="animate-spin mr-2" /> Carregando…
        </div>
      ) : (
        <OrderForm {...form} submitLabel="Reenviar pedido" />
      )}
    </main>
  );
};

export default EditOrderPage;
