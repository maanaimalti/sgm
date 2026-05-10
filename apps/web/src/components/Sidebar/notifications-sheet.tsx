"use client";

import { NotificationCenter } from "@/components/notifications/notification-center";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
        <NotificationCenter onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
