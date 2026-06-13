"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Home, Inbox, Layers, Package, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { AvatarInitials } from "@/components/ui-ext/avatar-initials";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSidebar } from "@/hooks/pages/use-sidebar";
import { useJwt } from "@/hooks/use-jwt";
import { unsubscribeFromPush } from "@/lib/push";
import { cn } from "@/lib/utils";

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

interface NavTab {
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  type?: "link" | "account";
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userData = useJwt<UserData>("accessToken");
  const { isKitchen, isAdmin } = useSidebar();
  const [accountOpen, setAccountOpen] = useState(false);

  const userName = userData?.name || userData?.username || "Usuário";
  const stockTab: NavTab =
    isKitchen || isAdmin
      ? { label: "Estoque", href: "/estoque", icon: Layers }
      : { label: "Produtos", href: "/produtos", icon: Package };

  const tabs: NavTab[] = [
    { label: "Início", href: "/inicio", icon: Home },
    { label: "Pedidos", href: "/pedidos", icon: Inbox },
    stockTab,
    { label: "Conta", icon: User, type: "account" },
  ];

  const handleLogout = async () => {
    await unsubscribeFromPush().catch(() => undefined);
    localStorage.removeItem("accessToken");
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    queryClient.clear();
    setAccountOpen(false);
    router.push("/");
  };

  return (
    <>
      <nav
        aria-label="Navegação mobile"
        className="fixed bottom-0 inset-x-0 z-20 h-16 bg-card border-t border-line flex items-stretch"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isAccount = tab.type === "account";
          const active =
            !isAccount && tab.href ? pathname.startsWith(tab.href) : false;
          const cls = cn(
            "flex-1 flex flex-col items-center justify-center gap-1 text-[10.5px]",
            active
              ? "text-brand-ink font-semibold"
              : "text-muted hover:text-ink-2",
          );

          if (isAccount) {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setAccountOpen(true)}
                aria-label="Conta"
                className={cls}
              >
                <Icon size={18} strokeWidth={1.5} />
                <span>{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href as string}
              aria-current={active ? "page" : undefined}
              className={cls}
            >
              <Icon size={18} strokeWidth={active ? 1.8 : 1.5} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent side="bottom" className="rounded-t-3 p-5">
          <nav aria-label="Conta" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <AvatarInitials name={userName} size={44} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-ink font-medium truncate">
                  {userName}
                </div>
                <div className="text-[12px] text-muted">
                  {roleLabel(userData?.roles)}
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              Sair
            </Button>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
