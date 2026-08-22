"use client";

import { Bell, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { AvatarInitials } from "@/components/ui-ext/avatar-initials";
import { Mark } from "@/components/ui-ext/brand-mark";
import { Input, InputGroup } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";

import type { MobileHeaderConfig } from "./mobile-header-context";

interface MobileTopBarProps {
  header: MobileHeaderConfig;
}

export function MobileTopBar({ header }: MobileTopBarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const userName = user?.name ?? "Usuário";

  return (
    <header className="sticky top-0 z-20 bg-surface border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 py-2.5 h-14">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mark size={28} />
          {header.title && (
            <span className="font-serif text-[18px] text-ink truncate">
              {header.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/notificacoes")}
            aria-label="Notificações"
            className="relative inline-flex items-center justify-center size-9 rounded-full bg-card border border-line hover:bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
          >
            <Bell size={16} className="text-ink-2" />
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} não lidas`}
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-pill bg-bad text-card text-[10px] font-semibold border-2 border-card"
              >
                {unreadCount}
              </span>
            )}
          </button>
          <AvatarInitials name={userName} size={36} />
        </div>
      </div>

      {header.search && (
        <div className="px-4 pb-3">
          <InputGroup
            leading={<Search size={14} />}
            className="h-10 rounded-pill"
          >
            <Input
              value={header.search.value}
              onChange={(e) => header.search?.onChange(e.target.value)}
              placeholder={header.search.placeholder ?? "Buscar..."}
            />
          </InputGroup>
        </div>
      )}
      {header.filters && (
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 w-max">
            {header.filters}
          </div>
        </div>
      )}
    </header>
  );
}
