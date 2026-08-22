"use client";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircleIcon,
  Mail,
  Shield,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

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
import { useLogin } from "@/hooks/pages/use-login";

/**
 * /auth/confirm sends people here with ?erro=link-invalido when a token is
 * expired or already spent. Reading it needs useSearchParams, which forces a
 * Suspense boundary — hence the split from the page component.
 */
function ExpiredLinkNotice() {
  const isInvalidLink = useSearchParams().get("erro") === "link-invalido";
  if (!isInvalidLink) return null;

  return (
    <div className="flex items-start gap-2.5 px-3.5 py-3 mb-5 rounded-2 border border-bad/30 bg-bad-soft text-[12.5px] leading-[1.5] text-bad-ink">
      <AlertCircle size={14} className="shrink-0 mt-0.5" />
      <span>
        O link expirou ou já foi usado. Peça um novo convite ao administrador.
      </span>
    </div>
  );
}

export default function LoginPage() {
  const { form, loginMutateIsLoading, onSubmit } = useLogin();
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 md:grid-cols-[5fr_6fr]">
      <AuthBrandPanel />

      <section className="flex items-center justify-center p-6 md:p-10 bg-surface">
        <div className="w-full max-w-[360px]">
          <Suspense fallback={null}>
            <ExpiredLinkNotice />
          </Suspense>
          <h1 className="font-serif text-[32px] tracking-[-0.02em] text-ink">
            Entre na sua conta
          </h1>
          <p className="mt-1.5 text-[14px] text-muted">
            Use o e-mail cadastrado pela administração.
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">E-mail</FormLabel>
                    <FormControl>
                      <InputGroup leading={<Mail size={15} />}>
                        <Input
                          id="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="ex: maria@icmalagoas.org.br"
                          disabled={loginMutateIsLoading}
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="password">Senha</FormLabel>
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
                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        }
                      >
                        <Input
                          id="password"
                          type={showPw ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          disabled={loginMutateIsLoading}
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
                disabled={loginMutateIsLoading}
              >
                {loginMutateIsLoading ? (
                  <LoaderCircleIcon className="animate-spin h-4 w-4" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-soft rounded-2 text-[12.5px] text-muted leading-[1.5] mt-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Esqueceu sua senha? Fale com um administrador para redefinir o
                  acesso.
                </span>
              </div>
            </form>
          </Form>
        </div>
      </section>
    </div>
  );
}
