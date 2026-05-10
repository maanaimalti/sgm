"use client";

import { presentNotification } from "@/components/notifications/notif-icon";
import { EmptyState } from "@/components/ui-ext/empty-state";
import { FilterChip } from "@/components/ui-ext/filter-chip";
import { NotifRow } from "@/components/ui-ext/notif-row";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationResponse } from "@sgm/shared";
import { Bell } from "lucide-react";

interface NotificationCenterProps {
  onNavigate?: () => void;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 2) return "ontem";
  return `${Math.floor(diff / 86400)} d`;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupByDay(items: NotificationResponse[]) {
  const todayMs = startOfToday();
  const today: NotificationResponse[] = [];
  const previous: NotificationResponse[] = [];
  for (const n of items) {
    if (new Date(n.createdAt).getTime() >= todayMs) today.push(n);
    else previous.push(n);
  }
  return { today, previous };
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 text-[10.5px] uppercase tracking-[0.14em] text-faint bg-surface border-b border-line">
      {children}
    </div>
  );
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const {
    view,
    setView,
    items,
    unreadCount,
    totalUnread,
    isLoading,
    handleClickItem,
    handleMarkAllRead,
    isMarkingAllRead,
  } = useNotifications();

  const { today, previous } = groupByDay(items);

  return (
    <div className="flex flex-col h-full">
      <header className="px-5 pt-5 pb-3 border-b border-line bg-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-[22px] text-ink leading-none">
            Notificações
          </h2>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <FilterChip
              active={view === "unread"}
              count={unreadCount}
              onClick={() => setView("unread")}
            >
              Não lidas
            </FilterChip>
            <FilterChip
              active={view === "all"}
              onClick={() => setView("all")}
            >
              Todas
            </FilterChip>
          </div>
          <Button
            variant="link"
            size="sm"
            disabled={isMarkingAllRead || totalUnread === 0}
            onClick={handleMarkAllRead}
          >
            Marcar tudo
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-[13px] text-muted">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Bell}
              title={view === "unread" ? "Tudo em dia" : "Nenhuma notificação"}
              description={
                view === "unread"
                  ? "Você está em dia com todas as notificações."
                  : "Nada por aqui ainda."
              }
            />
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <>
                <SectionHeader>Hoje</SectionHeader>
                <div className="divide-y divide-line">
                  {today.map((n) => {
                    const p = presentNotification(n);
                    return (
                      <NotifRow
                        key={n.id}
                        icon={p.icon}
                        tone={p.tone}
                        title={p.title}
                        body={p.body}
                        ago={relativeTime(n.createdAt)}
                        unread={!n.readableAt}
                        onClick={() => {
                          handleClickItem(n);
                          if (p.deeplink) onNavigate?.();
                        }}
                      />
                    );
                  })}
                </div>
              </>
            )}
            {previous.length > 0 && (
              <>
                <SectionHeader>Anteriores</SectionHeader>
                <div className="divide-y divide-line">
                  {previous.map((n) => {
                    const p = presentNotification(n);
                    return (
                      <NotifRow
                        key={n.id}
                        icon={p.icon}
                        tone={p.tone}
                        title={p.title}
                        body={p.body}
                        ago={relativeTime(n.createdAt)}
                        unread={!n.readableAt}
                        onClick={() => {
                          handleClickItem(n);
                          if (p.deeplink) onNavigate?.();
                        }}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
