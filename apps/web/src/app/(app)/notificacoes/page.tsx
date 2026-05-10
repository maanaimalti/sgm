"use client";

import { NotificationCenter } from "@/components/notifications/notification-center";
import { useMobileHeader } from "@/components/shell/mobile-header-context";

export default function NotificacoesPage() {
  useMobileHeader({ title: "Notificações" });

  return (
    <div className="md:max-w-[640px] md:mx-auto md:py-6">
      <div className="md:bg-card md:border md:border-line md:rounded-3 md:shadow-sm-warm md:overflow-hidden md:h-[calc(100dvh-160px)]">
        <NotificationCenter />
      </div>
    </div>
  );
}
