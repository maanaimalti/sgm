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

    // Self-heal from a stale/poisoned PWA cache. A standalone install can be
    // left holding a build chunk that a later deploy purged, which throws
    // ChunkLoadError on navigation and otherwise traps the user on this screen.
    // Clear the caches and reload once so fresh chunks are fetched. The
    // sessionStorage guard prevents a reload loop if the failure is unrelated.
    if (typeof window === "undefined") return;
    const signature = `${error?.name ?? ""}: ${error?.message ?? ""}`;
    const isChunkError =
      /ChunkLoadError|Loading chunk [\d]+ failed|dynamically imported module|importing a module script failed|Failed to fetch dynamically/i.test(
        signature,
      );
    if (!isChunkError) return;

    const KEY = "sgm:chunk-recovery";
    const now = Date.now();
    const last = Number(window.sessionStorage.getItem(KEY) ?? "0");
    if (now - last < 15000) return; // already attempted recently
    window.sessionStorage.setItem(KEY, String(now));

    const reload = () => window.location.reload();
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => undefined)
        .finally(reload);
    } else {
      reload();
    }
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
