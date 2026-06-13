"use client";

import {
  useFAB,
  useMobileHeader,
} from "@/components/shell/mobile-header-context";
import { AvatarInitials } from "@/components/ui-ext/avatar-initials";
import { OrderStatusChip } from "@/components/ui-ext/status-chip";
import { SummaryStat } from "@/components/ui-ext/summary-stat";
import { useSidebar } from "@/hooks/pages/use-sidebar";
import { useInicio } from "@/hooks/use-inicio";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useJwt } from "@/hooks/use-jwt";
import type { OrderListItem } from "@sgm/shared";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UserData {
  username: string;
  name?: string;
  sub: string;
  roles: string[];
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export default function InicioPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const userData = useJwt<UserData>("accessToken");
  const { isKitchen, isAdmin } = useSidebar();
  const {
    pendingCount,
    stockAlertCount,
    recentOrders,
    unreadCount,
    recentLoading,
  } = useInicio();

  const firstName =
    (userData?.name || userData?.username || "").split(" ")[0] || "Olá";

  useMobileHeader({ title: `Olá, ${firstName}` });
  useFAB(
    isKitchen || isAdmin
      ? {
          icon: <Plus size={20} />,
          label: "Novo pedido",
          onClick: () => router.push("/pedidos/novo"),
        }
      : null,
  );

  useEffect(() => {
    if (!isMobile) router.replace("/pedidos");
  }, [isMobile, router]);

  if (!isMobile) return null;

  const showStockTile = isKitchen || isAdmin;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Link href="/pedidos?status=PENDING" aria-label="Pedidos pendentes">
          <SummaryStat
            label="Pendentes"
            value={pendingCount}
            hint="aguardando"
            tone={pendingCount > 0 ? "warn" : "default"}
          />
        </Link>

        {showStockTile && (
          <Link href="/estoque?stock=low" aria-label="Estoque com alerta">
            <SummaryStat
              label="Estoque atenção"
              value={stockAlertCount}
              hint="itens em alerta"
              tone={stockAlertCount > 0 ? "warn" : "default"}
            />
          </Link>
        )}

        <Link href="/notificacoes" aria-label="Notificações">
          <SummaryStat
            label="Notificações"
            value={unreadCount}
            hint="não lidas"
          />
        </Link>
      </div>

      <section className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-faint font-medium">
            Últimos pedidos
          </span>
          <Link
            href="/pedidos"
            className="text-[12px] text-brand-ink font-medium inline-flex items-center gap-0.5"
          >
            Ver todos <ChevronRight size={13} />
          </Link>
        </div>

        {recentLoading ? (
          <div className="text-[13px] text-muted">Carregando…</div>
        ) : recentOrders.length === 0 ? null : (
          <div className="flex flex-col gap-2">
            {recentOrders.map((o: OrderListItem) => (
              <Link
                key={o.id}
                href={`/pedidos/${o.id}`}
                className="bg-card border border-line rounded-3 p-3 shadow-sm-warm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[12.5px] text-ink-2 font-medium">
                    {o.friendlyCode ?? `#${o.id.slice(0, 4)}`}
                  </span>
                  <span className="text-[11.5px] text-muted">
                    {formatShortDate(o.createdAt)}
                  </span>
                </div>
                <div className="text-[14px] text-ink font-medium truncate">
                  {o.event ?? "—"}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <OrderStatusChip status={o.status} />
                  <div className="flex items-center gap-1.5 text-[12px] text-muted">
                    <AvatarInitials name={o.user.name} size={20} />
                    <span className="truncate max-w-[140px]">
                      {o.user.name}
                    </span>
                    <span className="text-faint">·</span>
                    <span>{o.itemCount ?? 0} itens</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
