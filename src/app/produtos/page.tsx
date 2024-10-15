"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { TableLoading } from "@/components/table-loading";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProductPage } from "@/hooks/pages/use-product";
import { EditIcon, LoaderCircleIcon, TrashIcon } from "lucide-react";

const ProductsPage = () => {
  const {
    deleteIsLoading,
    handleClickNewProduct,
    handleDeleteProduct,
    handleEditProduct,
    isLoading,
    products,
    total,
    currentPage,
    setCurrentPage
  } = useProductPage();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <section className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </section>
      <section>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg md:text-2xl">Produtos</h1>
            <Button size="sm" onClick={handleClickNewProduct}>Novo produto</Button>
          </div>
          <div className="border shadow-sm rounded-lg p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>

              {
                isLoading ? (
                  <TableLoading />
                ) : (
                  <TableBody>
                    {
                      products?.map(product => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.category.name || " - "}</TableCell>
                          <TableCell className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEditProduct(product.id)}
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  disabled={deleteIsLoading}
                                >
                                  {
                                    deleteIsLoading ?
                                      <LoaderCircleIcon className="animate-spin h-4 w-4" /> :
                                      <TrashIcon className="h-4 w-4" />
                                  }
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Tem certeza que deseja excluir a unidade de medida?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Essa ação não poderá ser desfeita. Todos os produtos relacionados ficarão sem unidade de medida.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction asChild className="bg-red-600 hover:bg-red-700">
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDeleteProduct(product.id)}
                                    >
                                      Excluir
                                    </Button>
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
              Mostrando {products?.length} de {total} produtos
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
}

export default ProductsPage;