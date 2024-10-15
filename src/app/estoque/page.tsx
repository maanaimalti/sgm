"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { TableLoading } from "@/components/table-loading";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStockPage } from "@/hooks/pages/use-stock";

const EstoquePage = () => {
  const { isLoading, stock, handleUpdateStock } = useStockPage();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <section className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </section>
      <section>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg md:text-2xl">Estoque</h1>
            <Button size="sm" onClick={handleUpdateStock}>Alterar estoque</Button>
          </div>
          <div className="border shadow-sm rounded-lg p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Área</TableHead>
                </TableRow>
              </TableHeader>

              {
                isLoading ? (
                  <TableLoading />
                ) : (
                  <TableBody>
                    {
                      stock?.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.area}</TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                )
              }
            </Table>
          </div>
        </main>
      </section>
    </div>
  );
}

export default EstoquePage;