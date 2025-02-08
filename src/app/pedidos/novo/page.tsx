"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useNewOrderPage } from "@/hooks/pages/use-new-order";
import { cn } from "@/lib/utils";
import { PopoverContent } from "@radix-ui/react-popover";
import { CheckIcon, ChevronsUpDownIcon, TrashIcon } from "lucide-react";

const NewOrderPage = () => {
  const {
    items,
    products,
    currentProduct,
    currentQuantity,
    currentEventName,
    currentObservation,
    setCurrentObservation,
    handleAddProduct,
    handleSelectProduct,
    setCurrentQuantity,
    handleRemoveItem,
    handleConfirmOrder,
    setCurrentEventName,
    setProductSearchValue
  } = useNewOrderPage();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </div>
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg md:text-2xl">
              Pedido  
            </h1>
          </div>
          <div className="border shadow-sm rounded-lg p-6 gap-8 flex flex-col">
            <div className="flex flex-col gap-2">
              <Label>Nome do evento</Label>
              <Input 
                placeholder="Digite o nome do evento" 
                value={currentEventName} 
                onChange={(e) => setCurrentEventName(e.target.value)}
              />
            </div>
          </div>
          <div className="border shadow-sm rounded-lg p-6 gap-8 flex flex-col">
            <div className="flex w-full items-center gap-3">
              <div className="flex-1">
                <Label>Produto</Label>
                {/* <Command>
                  <CommandInput placeholder="Digite o nome do produto" />
                  <CommandEmpty>Produto não encontrado</CommandEmpty>
                  <CommandGroup>
                    {
                      products?.map(product => (
                        <CommandItem
                          key={product.id}
                          onSelect={(currentValue) => {
                            setProductSearchValue(currentValue);
                          }}
                          // value={`${product.id}-${product.name}-${product.unity.name}`}
                        >
                          {product.name}
                        </CommandItem>
                      ))
                    }
                  </CommandGroup>
                </Command> */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      // aria-expanded={open}
                      className="w-full justify-between"
                    >
                      {currentProduct?.name
                        ? currentProduct.name
                        : "Selecione o produto"}
                      <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 z-20">
                    <Command className="z-30">
                      <CommandInput placeholder="Pesquisar produto" />
                      <CommandList>
                        <CommandEmpty>Produto não encontrado.</CommandEmpty>
                      </CommandList>
                      <CommandGroup>
                        {
                          products?.map(product => (
                            <CommandItem
                              key={product.id}
                              value={`${product.id}-${product.name}-${product.unity.name}`}
                              onSelect={(currentValue) => {
                                setProductSearchValue(currentValue)
                              }}
                            >
                              <CheckIcon 
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  currentProduct?.id === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.name}
                            </CommandItem>
                          ))
                        }
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {/* <Select 
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
                </Select> */}
              </div>
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
            <div className="flex flex-col gap-2 w-full">
              <Label>Observação</Label>
              <Textarea 
                value={currentObservation} 
                onChange={(e) => setCurrentObservation(e.target.value)} 
              />
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
                      <TableCell>
                        {item.quantity || " - "} {item.unity}
                      </TableCell>
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
                disabled={!items.length && !currentEventName.trim().length}
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