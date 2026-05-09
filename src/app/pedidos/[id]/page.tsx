"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEditOrderPage } from "@/hooks/pages/use-edit-order";
import { LoaderCircleIcon } from "lucide-react";

const EditOrderPage = () => {
  const {
    order,
    cancelIsLoading,
    confirmIsLoading,
    handleCancelOrder,
    handleConfirmOrder,
  } = useEditOrderPage();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </div>
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center">
            <h1 className="font-semibold text-lg md:text-2xl">
              Pedido - {order?.id}
            </h1>
          </div>
          <div className="border shadow-sm rounded-lg p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order?.orderItem.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product.name}</TableCell>
                    <TableCell>
                      {item.quantity || " - "} {item.product.unity.name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-6 mt-5">
              <Button
                className="flex-1"
                variant="destructive"
                disabled={cancelIsLoading || order?.status === "CANCELED"}
                onClick={handleCancelOrder}
              >
                {cancelIsLoading ? (
                  <LoaderCircleIcon className="animate-spin h-4 w-4" />
                ) : (
                  "Cancelar pedido"
                )}
              </Button>
              <Button
                className="flex-1"
                disabled={confirmIsLoading || order?.status === "APPROVED"}
                onClick={handleConfirmOrder}
              >
                {confirmIsLoading ? (
                  <LoaderCircleIcon className="animate-spin h-4 w-4" />
                ) : (
                  "Confirmar pedido"
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditOrderPage;
