import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Página não encontrada</CardTitle>
          <CardDescription>
            A página que você procura não existe ou foi movida.
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <Button className="w-full" asChild>
            <Link href="/pedidos">Voltar para o início</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
