"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useEditUnit } from "@/hooks/pages/use-edit-unit";
import { LoaderCircleIcon } from "lucide-react";

const EditUnitPage = () => {
  const { editUnitIsLoading, form, unit, isLoading, onSubmit } = useEditUnit();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <section className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </section>
      <section>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg md:text-2xl">Editar unidade de medida</h1>
          </div>
          <div className="border shadow-sm rounded-lg p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <FormField
                      control={form.control}
                      name="id"
                      disabled
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="id">id</FormLabel>
                          <FormControl>
                            {
                              isLoading ? (
                                <Skeleton className="h-8 w-full" />
                              ) : (
                                <Input id="id" {...field} />
                              )
                            }
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="name">Nome</FormLabel>
                          <FormControl>
                            {
                              isLoading ? (
                                <Skeleton className="h-8 w-full" />
                              ) : (
                                <Input id="name" placeholder="Digite a unidade de medida" {...field} />
                              )
                            }
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="description">Descrição (opcional)</FormLabel>
                          <FormControl>
                            {
                              isLoading ? (
                                <Skeleton className="h-20 w-full" />
                              ) : (
                                <Textarea 
                                  id="description" 
                                  placeholder="Digite a descrição da unidade de medida" 
                                  {...field} 
                                />
                              )
                            }
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={editUnitIsLoading}
                  >
                    {
                      editUnitIsLoading ? (
                        <LoaderCircleIcon className="animate-spin h-4 w-4" />
                      ) : "Salvar"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </section>
    </div>
  );
};

export default EditUnitPage;