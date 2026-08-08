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
import { useState } from "react";

import { Logo } from "@/components/ui-ext/brand-mark";
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

export default function LoginPage() {
  const { form, loginMutateIsLoading, onSubmit } = useLogin();
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 md:grid-cols-[5fr_6fr]">
      <section
        aria-hidden="false"
        className="relative flex flex-col justify-between p-8 md:p-12 overflow-hidden md:min-h-screen min-h-[260px]"
        style={{
          background: "linear-gradient(180deg, #f9efe9 0%, #f4ebe5 100%)",
        }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          style={{ opacity: 0.18 }}
        >
          <path
            d="M-50 600 C 100 300, 300 200, 650 250"
            stroke="#ab2c2c"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M-30 700 C 120 420, 320 320, 680 360"
            stroke="#ab2c2c"
            strokeWidth="1"
            fill="none"
          />
          <ellipse
            cx="450"
            cy="180"
            rx="140"
            ry="60"
            transform="rotate(-25 450 180)"
            stroke="#ab2c2c"
            strokeWidth="1"
            fill="none"
          />
        </svg>
        <div className="relative z-10">
          <Logo width={200} priority />
        </div>
        <div className="relative z-10 max-w-[380px]">
          <h1 className="font-serif text-[36px] md:text-[48px] leading-[1.05] tracking-[-0.02em] text-ink">
            Estoque e pedidos
            <br />
            <span className="italic text-[#ab2c2c]">do começo ao fim.</span>
          </h1>
          <p className="mt-4 text-[14px] leading-[1.55] text-ink-2 max-w-[320px]">
            Sistema interno de gestão do Maanaim de Alagoas. Cozinha, compras e
            administração no mesmo lugar.
          </p>
        </div>
        <div className="relative z-10 flex gap-6 text-[12px] text-muted">
          © Maanaim de Alagoas · v2.0
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-10 bg-surface">
        <div className="w-full max-w-[360px]">
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
