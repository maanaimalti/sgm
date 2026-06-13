"use client";

import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/ui-ext/page-header";
import { Button } from "@/components/ui/button";
import { useNewOrderPage } from "@/hooks/pages/use-new-order";
import { ChevronLeft } from "lucide-react";

const NewOrderPage = () => {
  const form = useNewOrderPage();

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        crumbs={["Compras", "Pedidos", "Novo pedido"]}
        title="Novo pedido"
        subtitle="Monte o pedido para um evento. Os itens podem ser editados antes de fechar."
        actions={
          <Button variant="ghost" size="sm" onClick={form.goBack}>
            <ChevronLeft size={14} className="mr-1" />
            Voltar
          </Button>
        }
      />

      <OrderForm {...form} submitLabel="Fechar pedido" />
    </main>
  );
};

export default NewOrderPage;
