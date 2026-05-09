"use client";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNewCategory } from "@/hooks/pages/use-new-category";
import { LoaderCircleIcon } from "lucide-react";

const NewCategoryPage = () => {
  const { form, createCategoryIsLoading, onSubmit } = useNewCategory();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <section className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </section>
      <section>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg md:text-2xl">
              Nova categoria
            </h1>
          </div>
          <div className="border shadow-sm rounded-lg p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="name">Name</FormLabel>
                          <FormControl>
                            <Input
                              id="name"
                              placeholder="Digite a categoria"
                              {...field}
                            />
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
                          <FormLabel htmlFor="description">
                            Descrição (opcional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              id="description"
                              placeholder="Digite a descrição da categoria"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={createCategoryIsLoading}>
                    {createCategoryIsLoading ? (
                      <LoaderCircleIcon className="animate-spin h-4 w-4" />
                    ) : (
                      "Salvar"
                    )}
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

export default NewCategoryPage;
