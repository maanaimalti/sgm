"use client";

import { Eye, EyeOff, LoaderCircleIcon, Shield } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input, InputGroup } from "@/components/ui/input";
import { useChangePassword } from "@/hooks/pages/use-change-password";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const { form, isSubmitting, onSubmit } = useChangePassword(() =>
    onOpenChange(false),
  );
  const [reveal, setReveal] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>
            Ao confirmar, você será desconectado e precisará entrar novamente
            com a nova senha.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="currentPassword">Senha atual</FormLabel>
                  <FormControl>
                    <InputGroup leading={<Shield size={15} />}>
                      <Input
                        id="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="newPassword">Nova senha</FormLabel>
                  <FormControl>
                    <InputGroup
                      leading={<Shield size={15} />}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setReveal((value) => !value)}
                          aria-label={
                            reveal ? "Ocultar senha" : "Mostrar senha"
                          }
                          className="inline-flex items-center justify-center text-muted hover:text-ink-2 transition-colors"
                        >
                          {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      }
                    >
                      <Input
                        id="newPassword"
                        type={reveal ? "text" : "password"}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="confirmPassword">
                    Confirmar nova senha
                  </FormLabel>
                  <FormControl>
                    <InputGroup leading={<Shield size={15} />}>
                      <Input
                        id="confirmPassword"
                        type={reveal ? "text" : "password"}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircleIcon className="animate-spin h-4 w-4" />
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
