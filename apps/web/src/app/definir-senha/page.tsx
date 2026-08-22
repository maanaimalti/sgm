"use client";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  LoaderCircleIcon,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthBrandPanel } from "@/components/ui-ext/auth-brand-panel";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input, InputGroup } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetPassword } from "@/hooks/pages/use-set-password";
import { useAuth } from "@/hooks/use-auth";

/**
 * Where an invite or a recovery link ends up, after /auth/confirm has turned
 * its token into a session.
 *
 * Deliberately outside the (app) route group. There is no shell here — the
 * person has no business in the app until they have a password — and keeping
 * it out means AuthGate's "must set a password" redirect can be unconditional
 * instead of having to special-case its own destination.
 */
export default function SetPasswordPage() {
  const { user, isLoading } = useAuth();
  const { form, isSubmitting, isDone, onSubmit } = useSetPassword();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);

  // Someone who already chose a password has no business here — the API would
  // refuse the submit anyway. Most often this is the back button after a
  // successful reset.
  const alreadySet = !!user && !user.mustSetPassword;
  useEffect(() => {
    if (!isLoading && alreadySet && !isDone) {
      router.replace("/pedidos");
    }
  }, [isLoading, alreadySet, isDone, router]);

  const showForm = !!user && !alreadySet;

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 md:grid-cols-[5fr_6fr]">
      <AuthBrandPanel />

      <section className="flex items-center justify-center p-6 md:p-10 bg-surface">
        <div className="w-full max-w-[360px]">
          {isLoading || isDone || alreadySet ? (
            <div className="space-y-4">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : showForm ? (
            <>
              <h1 className="font-serif text-[32px] tracking-[-0.02em] text-ink">
                Defina sua senha
              </h1>
              <p className="mt-1.5 text-[14px] text-muted">
                Você entrou pelo link do convite. Escolha uma senha para acessar
                o sistema.
              </p>

              <Form {...form}>
                <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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
                                onClick={() => setShowPw((s) => !s)}
                                aria-label={
                                  showPw ? "Ocultar senha" : "Mostrar senha"
                                }
                                className="inline-flex items-center justify-center text-muted hover:text-ink-2 transition-colors"
                              >
                                {showPw ? (
                                  <EyeOff size={15} />
                                ) : (
                                  <Eye size={15} />
                                )}
                              </button>
                            }
                          >
                            <Input
                              id="newPassword"
                              type={showPw ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="Mínimo de 6 caracteres"
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
                              type={showPw ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="Repita a senha"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </InputGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-2 bg-[#ab2c2c] border-[#ab2c2c] hover:bg-[#8f2420]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <LoaderCircleIcon className="animate-spin h-4 w-4" />
                    ) : (
                      <>
                        Salvar e entrar
                        <ArrowRight size={15} />
                      </>
                    )}
                  </Button>

                  <div className="flex items-start gap-2.5 px-3.5 py-3 bg-soft rounded-2 text-[12.5px] text-muted leading-[1.5] mt-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Guarde essa senha. Ela é o que você vai usar para entrar
                      daqui em diante.
                    </span>
                  </div>
                </form>
              </Form>
            </>
          ) : (
            <>
              <h1 className="font-serif text-[32px] tracking-[-0.02em] text-ink">
                Link expirado
              </h1>
              <p className="mt-1.5 text-[14px] text-muted">
                Seu link expirou ou já foi usado. Peça um novo convite ao
                administrador.
              </p>
              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-soft rounded-2 text-[12.5px] text-muted leading-[1.5] mt-6">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Se você já tem uma senha, é só entrar normalmente.</span>
              </div>
              <Button asChild size="lg" className="w-full mt-4">
                <Link href="/">Ir para o login</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
