"use client";

import { NotificationCenter } from "@/components/notifications/notification-center";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({
  open,
  onOpenChange,
}: NotificationsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 flex flex-col">
        <SheetTitle className="sr-only">Notificações</SheetTitle>
        <NotificationCenter onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
