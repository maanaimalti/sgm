import { Wordmark } from "@/components/ui-ext/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6">
      <Card className="w-full max-w-md p-8">
        <Wordmark />
        <h1 className="mt-6 font-serif text-[28px] tracking-[-0.01em] text-ink">
          Página não encontrada
        </h1>
        <p className="mt-2 text-[13.5px] text-muted">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/pedidos">
              <ChevronLeft size={14} className="mr-1.5" />
              Voltar para os pedidos
            </Link>
          </Button>
        </div>
      </Card>
      <div className="mt-6 text-[11.5px] text-faint">
        © Maanaim de Alagoas · v2.0
      </div>
    </div>
  );
}
