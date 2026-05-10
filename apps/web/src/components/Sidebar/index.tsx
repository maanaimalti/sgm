"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Inbox,
  Layers,
  MoreHorizontal,
  Package,
  Paperclip,
  Weight,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { AvatarInitials } from "@/components/ui-ext/avatar-initials";
import { Wordmark } from "@/components/ui-ext/brand-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/hooks/pages/use-sidebar";
import { useJwt } from "@/hooks/use-jwt";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

import { NotificationsSheet } from "./notifications-sheet";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface UserData {
  username: string;
  name?: string;
  sub: string;
  roles: string[];
}

const roleLabel = (roles: string[] | undefined): string => {
  if (!roles?.length) return "";
  if (roles.includes("admin")) return "Administrador";
  if (roles.includes("manager")) return "Gerente";
  if (roles.includes("kitchen")) return "Cozinha";
  if (roles.includes("buyer")) return "Compras";
  return roles[0];
};

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userData = useJwt<UserData>("accessToken");
  const { isKitchen, isAdmin, isBuyer, isManager } = useSidebar();
  const { unreadCount } = useNotifications();

  const [sheetOpen, setSheetOpen] = useState(false);

  const groups: NavGroup[] = [];
  if (isKitchen || isAdmin) {
    groups.push({
      label: "Cadastros",
      items: [
        { label: "Categorias", href: "/categorias", icon: Paperclip },
        {
          label: "Unidade de medida",
          href: "/unidade-de-medida",
          icon: Weight,
        },
        { label: "Produtos", href: "/produtos", icon: Package },
      ],
    });
    groups.push({
      label: "Operação",
      items: [{ label: "Estoque", href: "/estoque", icon: Layers }],
    });
  }
  if (isBuyer || isAdmin || isKitchen || isManager) {
    groups.push({
      label: "Compras",
      items: [{ label: "Pedidos", href: "/pedidos", icon: Inbox }],
    });
  }

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    queryClient.clear();
    router.push("/");
  };

  const userName = userData?.name || userData?.username || "Usuário";

  return (
    <div className="flex h-full max-h-screen flex-col bg-surface">
      <div className="flex items-center justify-between px-5 py-5">
        <Wordmark />
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Notificações"
          className="relative inline-flex items-center justify-center size-9 rounded-full bg-transparent hover:bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
        >
          <Bell size={16} className="text-ink-2" />
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} não lidas`}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-pill bg-bad text-card text-[10px] font-semibold border-2 border-surface"
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <nav
        aria-label="Navegação principal"
        className="flex-1 overflow-auto px-3 py-2 flex flex-col gap-4"
      >
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-faint px-2.5 mb-1.5">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 px-3.5 py-2.5 rounded-2 text-[13.5px] transition-colors",
                      active
                        ? "bg-brand-soft text-brand-ink font-semibold"
                        : "text-ink-2 hover:bg-soft",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-pill bg-brand"
                      />
                    )}
                    <Icon size={15} strokeWidth={active ? 1.8 : 1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3 flex items-center gap-3">
        <AvatarInitials name={userName} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-ink font-medium truncate">
            {userName}
          </div>
          <div className="text-[11.5px] text-muted">
            {roleLabel(userData?.roles)}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              aria-label="Mais opções"
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-bad-ink"
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NotificationsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};
