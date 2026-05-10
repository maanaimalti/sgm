"use client";

import { Wordmark } from "@/components/ui-ext/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6">
      <Card className="w-full max-w-md p-8">
        <Wordmark />
        <h1 className="mt-6 font-serif text-[28px] tracking-[-0.01em] text-ink">
          Algo deu errado
        </h1>
        <p className="mt-2 text-[13.5px] text-muted">
          Não conseguimos carregar essa parte do sistema. Tente novamente — se
          persistir, fale com a administração.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={reset}>
            <RotateCw size={14} className="mr-1.5" />
            Tentar novamente
          </Button>
          <Button variant="ghost" onClick={() => router.push("/pedidos")}>
            <ChevronLeft size={14} className="mr-1.5" />
            Voltar para os pedidos
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && error?.message && (
          <details className="mt-6 rounded-2 bg-soft p-3">
            <summary className="cursor-pointer text-[12px] text-muted">
              Detalhes (dev)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11.5px] text-ink-2">
              {error.message}
            </pre>
          </details>
        )}
      </Card>
      <div className="mt-6 text-[11.5px] text-faint">
        © Maanaim de Alagoas · v2.0
      </div>
    </div>
  );
}
