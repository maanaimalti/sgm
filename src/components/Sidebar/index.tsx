"use client";

import { BellIcon, LogsIcon, PackageIcon, PaperclipIcon, WeightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-[60px] items-center border-b px-6">
        <Link href="#" className="flex items-center gap-2 font-semibold" prefetch={false}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={100}
            height={33}

          />
        </Link>
        <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
          <BellIcon className="h-4 w-4" />
          <span className="sr-only">Notificações</span>
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          <Link
            href="/categorias"
            className={
              `
                flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.includes("/categorias") ? "text-primary bg-muted" : ""}
              `
            }
          >
            <PaperclipIcon className="h-4 w-4" />
            Categorias
          </Link>
          <Link
            href="/unidade-de-medida"
            className={
              `
                flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.includes("/unidade-de-medida") ? "text-primary bg-muted" : ""}
              `
            }
          >
            <WeightIcon className="h-4 w-4" />
            Unidade de medida
          </Link>
          <Link
            href="/produtos"
            className={
              `
                flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.includes("/produtos") ? "text-primary bg-muted" : ""}
              `
            }
          >
            <PackageIcon className="h-4 w-4" />
            Produtos{" "}
          </Link>
          <Separator className="my-4" />
          <Link
            href="/pedidos"
            className={
              `
                flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.includes("/pedido") ? "text-primary bg-muted" : ""}
              `
            }
          >
            <LogsIcon className="h-4 w-4" />
            Pedido{" "}
          </Link>
        </nav>
      </div>
    </div>
  )
}