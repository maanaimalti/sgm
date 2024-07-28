"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNewOrderPage } from "@/hooks/pages/use-new-order";
import { TrashIcon } from "lucide-react";

const NewOrderPage = () => {
  const {
    items,
    products,
    currentProduct,
    currentQuantity,
    handleAddProduct,
    handleSelectProduct,
    setCurrentQuantity,
    handleRemoveItem,
    handleConfirmOrder,
  } = useNewOrderPage();

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
              Pedido
            </h1>
          </div>
          <div className="border shadow-sm rounded-lg p-6 gap-8 flex flex-col">
            <div className="flex w-full items-center gap-3">
              <div className="flex-1">
                <Select 
                  onValueChange={(value) => handleSelectProduct(value)}
                  value={`${currentProduct?.id}-${currentProduct?.name}`}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {
                      products?.map(product => (
                        <SelectItem 
                          key={product.id} 
                          value={`${product.id}-${product.name}`}
                        >
                          {product.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  className="w-full"
                  placeholder="Digite a quantidade" 
                  type="number" 
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex w-full">
              <Button 
                onClick={handleAddProduct} 
                className="w-full" 
                variant="outline"
                disabled={!currentProduct || !currentQuantity}
              >
                Adicionar item
              </Button>
            </div>
          </div>
          <div className="border shadow-sm rounded-lg p-6 flex flex-col gap-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {
                  items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.quantity || " - "}</TableCell>
                      <TableCell>
                        <Button 
                          onClick={() => handleRemoveItem(item.id)} 
                          variant="ghost"
                        >
                          <TrashIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
            <div>
              <Button
                onClick={handleConfirmOrder}
                className="w-full"
                disabled={!items.length}
              >
                Fechar pedido
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default NewOrderPage;