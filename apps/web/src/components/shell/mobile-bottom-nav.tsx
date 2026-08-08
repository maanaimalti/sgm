"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Home,
  Inbox,
  KeyRound,
  Layers,
  Menu as MenuIcon,
  Package,
  Paperclip,
  Users,
  Weight,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { AvatarInitials } from "@/components/ui-ext/avatar-initials";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
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

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number }>;

interface NavTab {
  label: string;
  href?: string;
  icon: IconType;
  type?: "link" | "menu";
}

interface NavLink {
  label: string;
  href: string;
  icon: IconType;
}

interface NavGroup {
  label: string;
  items: NavLink[];
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userData = useJwt<UserData>("accessToken");
  const { isKitchen, isAdmin, isBuyer, isManager } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const userName = userData?.name || userData?.username || "Usuário";
  // Kitchen/admin manage stock; manager/buyer get a Notificações tab in that
  // slot instead (Cadastros/Operação stay kitchen/admin only, per the sidebar).
  const canSeeStock = isKitchen || isAdmin;
  const thirdTab: NavTab = canSeeStock
    ? { label: "Estoque", href: "/estoque", icon: Layers }
    : { label: "Notificações", href: "/notificacoes", icon: Bell };

  const tabs: NavTab[] = [
    { label: "Início", href: "/inicio", icon: Home },
    { label: "Pedidos", href: "/pedidos", icon: Inbox },
    thirdTab,
    { label: "Menu", icon: MenuIcon, type: "menu" },
  ];

  // Full navigation, mirroring the desktop sidebar's role gating, so every
  // section stays reachable on mobile — the bottom bar only holds 3 primary
  // tabs, and the rest (Cadastros etc.) live in the Menu sheet.
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
  if (isAdmin) {
    groups.push({
      label: "Administração",
      items: [{ label: "Usuários", href: "/usuarios", icon: Users }],
    });
  }

  const handleLogout = async () => {
    await unsubscribeFromPush().catch(() => undefined);
    localStorage.removeItem("accessToken");
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    queryClient.clear();
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <>
      <nav
        aria-label="Navegação mobile"
        className="fixed bottom-0 inset-x-0 z-20 h-16 box-content pb-[env(safe-area-inset-bottom)] bg-card border-t border-line flex items-stretch"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isMenu = tab.type === "menu";
          const active =
            !isMenu && tab.href ? pathname.startsWith(tab.href) : false;
          const cls = cn(
            "flex-1 flex flex-col items-center justify-center gap-1 text-[10.5px]",
            active
              ? "text-brand-ink font-semibold"
              : "text-muted hover:text-ink-2",
          );

          if (isMenu) {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Menu"
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

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3 p-5 max-h-[85dvh] overflow-y-auto"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Navegação e opções da sua conta.
          </SheetDescription>

          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-faint mb-1.5">
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
                        onClick={() => setMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-2 text-[14px] transition-colors",
                          active
                            ? "bg-brand-soft text-brand-ink font-semibold"
                            : "text-ink-2 hover:bg-soft",
                        )}
                      >
                        <Icon size={16} strokeWidth={active ? 1.8 : 1.5} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="border-t border-line pt-4 flex items-center gap-3">
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
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setMenuOpen(false);
                setPasswordOpen(true);
              }}
            >
              <KeyRound size={14} className="mr-1.5" />
              Trocar senha
            </Button>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  );
}
