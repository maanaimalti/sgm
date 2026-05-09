"use client";

import {
  AlignJustifyIcon,
  LogsIcon,
  PackageIcon,
  PaperclipIcon,
  WeightIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useHeader } from "./use-header";

export const Header = () => {
  const { pathname, handleLogout } = useHeader();

  return (
    <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-muted/40 px-6 justify-between lg:justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border w-8 h-8 lg:hidden"
          >
            <AlignJustifyIcon size={24} />
            <span className="sr-only">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link
              href="/categorias"
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.includes("/categorias") ? "text-primary bg-muted" : ""}
              `}
            >
              <PaperclipIcon className="h-4 w-4" />
              Categorias
            </Link>
          </DropdownMenuItem>

          <Link
            href="/unidade-de-medida"
            className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.includes("/unidade-de-medida") ? "text-primary bg-muted" : ""}
              `}
          >
            <WeightIcon className="h-4 w-4" />
            Unidade de medida
          </Link>
          <Link
            href="/produtos"
            className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.includes("/produtos") ? "text-primary bg-muted" : ""}
              `}
          >
            <PackageIcon className="h-4 w-4" />
            Produtos{" "}
          </Link>
          <DropdownMenuSeparator className="my-4" />
          <Link
            href="/pedidos"
            className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.includes("/pedido") ? "text-primary bg-muted" : ""}
              `}
          >
            <LogsIcon className="h-4 w-4" />
            Pedido{" "}
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border w-8 h-8"
          >
            <Image
              src="/logo.png"
              width="32"
              height="32"
              className="rounded-full"
              alt="Avatar"
            />
            <span className="sr-only">Perfil</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
