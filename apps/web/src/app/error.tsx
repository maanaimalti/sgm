"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Algo deu errado</CardTitle>
          <CardDescription>
            Ocorreu um erro inesperado. Tente novamente em alguns instantes.
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <Button className="w-full" onClick={reset}>
            Tentar novamente
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
