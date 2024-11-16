"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUpdateStock } from "@/hooks/pages/use-update-stock";
import { TrashIcon } from "lucide-react";

const UpdateStockPage = () => {
  const {
    items,
    products,
    currentProduct,
    currentQuantity,
    transactionType,
    handleAddProduct,
    handleSelectProduct,
    setCurrentQuantity,
    handleRemoveItem,
    setProductSearchValue,
    handleSelectTransactionType,
    handleUpdateStock,
    setCurrentProduct
  } = useUpdateStock();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <section className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </section>
      <section>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg md:text-2xl">Alterar estoque</h1>
          </div>
          <div className="border shadow-sm rounded-lg p-6 gap-8 flex flex-col">
            <div className="flex w-full items-center gap-3">
              <div className="flex-1">
                <Label>Produto</Label>
                <Select
                  onValueChange={(value) => handleSelectProduct(value)}
                  value={`${currentProduct?.id}-${currentProduct?.name}-${currentProduct?.unity}`}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <Input
                      placeholder="Digite o nome do produto"
                      className="mb-2"
                      autoFocus={false}
                      onChange={(e) => setProductSearchValue(e.target.value)}
                    />
                    {
                      products?.map(product => (
                        <SelectItem
                          key={product.id}
                          value={`${product.id}-${product.name}-${product.unity.name}`}
                        >
                          {product.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex w-full items-center gap-3">
              <div className="flex-1">
                <Label>Quantidade</Label>
                <Input
                  className="w-full"
                  placeholder="Digite a quantidade"
                  type="number"
                  value={currentQuantity || ""}
                  onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <Label>Tipo de transação</Label>
                <Select
                  onValueChange={(value: 'in' | 'out') => handleSelectTransactionType(value)}
                  value={transactionType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de transação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">
                      Entrada
                    </SelectItem>
                    <SelectItem value="out">
                      Saída
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                  <TableHead>Tipo de transação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {
                  items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        {item.quantity || " - "} {item.unity}
                      </TableCell>
                      <TableCell>{item.type === 'in' ? 'Entrada' : 'Saída'}</TableCell>
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
                onClick={handleUpdateStock}
                className="w-full"
                disabled={!items.length}
              >
                Atualizar estoque
              </Button>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default UpdateStockPage;