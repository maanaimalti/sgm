"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { usePush } from "@/hooks/use-push";
import { BellOff, BellRing, Download, Loader2 } from "lucide-react";

/**
 * Banner shown inside the notification center to enable browser push and
 * install the app to the home screen / desktop.
 */
export function PushControls() {
  const { supported, permission, isSubscribed, busy, enable, disable } =
    usePush();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const { toast } = useToast();

  const showInstall = canInstall && !installed;

  if (!supported && !showInstall) return null;

  const handleEnable = async () => {
    const ok = await enable();
    toast(
      ok
        ? { title: "Notificações ativadas" }
        : {
            title: "Não foi possível ativar",
            description:
              permission === "denied"
                ? "Permissão bloqueada nas configurações do navegador."
                : "Verifique as permissões e tente novamente.",
            variant: "destructive",
          },
    );
  };

  const handleDisable = async () => {
    await disable();
    toast({ title: "Notificações desativadas" });
  };

  return (
    <div className="px-5 py-3 border-b border-line bg-surface flex flex-col gap-2">
      {supported && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isSubscribed ? (
              <BellRing size={15} className="text-ok shrink-0" />
            ) : (
              <BellOff size={15} className="text-muted shrink-0" />
            )}
            <span className="text-[12.5px] text-ink-2 truncate">
              {isSubscribed
                ? "Notificações push ativas neste dispositivo"
                : permission === "denied"
                  ? "Push bloqueado no navegador"
                  : "Receba avisos mesmo com o app fechado"}
            </span>
          </div>
          {isSubscribed ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={handleDisable}
            >
              {busy && <Loader2 size={13} className="mr-1 animate-spin" />}
              Desativar
            </Button>
          ) : (
            permission !== "denied" && (
              <Button
                variant="soft"
                size="sm"
                disabled={busy}
                onClick={handleEnable}
              >
                {busy && <Loader2 size={13} className="mr-1 animate-spin" />}
                Ativar
              </Button>
            )
          )}
        </div>
      )}

      {showInstall && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-ink-2 truncate">
            Instalar o app no dispositivo
          </span>
          <Button variant="secondary" size="sm" onClick={promptInstall}>
            <Download size={13} className="mr-1" />
            Instalar
          </Button>
        </div>
      )}
    </div>
  );
}
