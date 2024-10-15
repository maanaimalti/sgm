import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/header";

const UpdateStockPage = () => {
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
          </main>
      </section>
    </div>
  );
};

export default UpdateStockPage;