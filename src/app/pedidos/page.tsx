"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { TableLoading } from "@/components/table-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrdersPage } from "@/hooks/pages/use-orders";
import { DownloadIcon } from "@radix-ui/react-icons";
import { EditIcon, LoaderCircleIcon } from "lucide-react";

const PedidosPage = () => {
  const {
    handleClickNewOrder,
    setCurrentPage,
    handleEditOrder,
    handleDownloadOrder,
    isLoadingDownload,
    currentPage,
    total,
    isLoading,
    orders,
    isAdmin,
    isBuyer,
    isKitchen,
    isManager
  } = useOrdersPage();
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <section className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </section>
      <section>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg md:text-2xl">Pedidos</h1>
            {
              (isKitchen || isAdmin) && (
                <Button size="sm" onClick={handleClickNewOrder}>Novo pedido</Button>
              )
            }
          </div>
          <div className="border shadow-sm rounded-lg p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              {
                isLoading ? (
                  <TableLoading />
                ) : (
                  <TableBody>
                    {
                      orders?.map(order => (
                        <TableRow key={order.id}>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{order.user.name || " - "}</TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleString("pt-BR", {
                              timeZone: "America/Sao_Paulo",
                            })}
                          </TableCell>
                          <TableCell>
                            {
                              order?.status?.toLocaleLowerCase() === "pending" ? (
                                <Badge variant="warning">Pendente</Badge>
                              ) : (
                                  order?.status?.toLocaleLowerCase() === "canceled" ? (
                                  <Badge variant="destructive">Cancelado</Badge>
                                ) : <Badge variant="success">Aprovado</Badge>
                              )
                            }
                          </TableCell>
                          <TableCell>
                            {
                              (isAdmin || isManager) && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEditOrder(order.id)}
                                  >
                                    <EditIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            }
                            {
                              (isAdmin || isManager || isBuyer) && (
                                <div className="flex gap-2">
                                  {
                                    order?.status === "APPROVED" && (
                                      <Button
                                        variant="warning"
                                        size="icon"
                                        disabled={isLoadingDownload}
                                        onClick={() => handleDownloadOrder(order.id)}
                                      >
                                        {
                                          isLoadingDownload ?
                                            <LoaderCircleIcon className="animate-spin h-4 w-4" /> :
                                            <DownloadIcon className="h-4 w-4" />
                                        }
                                      </Button>
                                    )
                                  }
                                </div>
                              )
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                )
              }
            </Table>
          </div>
          <div className="flex justify-between items-center px-4 py-2 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {orders?.length} de {total} pedidos
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                disabled
                size="sm"
                variant="ghost"
                className="text-foreground"
              >
                {currentPage}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === (Math.ceil(total ?? 0 / 10))}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default PedidosPage;