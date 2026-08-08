import { useToast } from "@/components/ui/use-toast";
import { GetAuthMeFetcher, authMeQueryKey } from "@/data/fetchers/auth/me";
import { type LoginForm, loginSchema } from "@/data/schemas/login-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type AuthError, isAuthApiError } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

/**
 * Matching on `code` rather than `message`: the message is localizable and has
 * changed between GoTrue versions, so both are checked.
 */
function describe(error: AuthError): { title: string; description: string } {
  if (
    isAuthApiError(error) &&
    (error.code === "invalid_credentials" ||
      error.message === "Invalid login credentials")
  ) {
    return {
      title: "E-mail ou senha inválidos",
      description: "Verifique o e-mail e a senha e tente de novo",
    };
  }

  if (error.code === "email_not_confirmed") {
    return {
      title: "Conta não confirmada",
      description: "Fale com um administrador para liberar o acesso",
    };
  }

  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return {
      title: "Muitas tentativas",
      description: "Espere um minuto antes de tentar de novo",
    };
  }

  return {
    title: "Erro ao fazer login",
    description: "Tente novamente mais tarde",
  };
}

export const useLogin = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const loginMutate = useMutation({
    mutationKey: ["login"],
    mutationFn: async ({ email, password }: LoginForm) => {
      const { data, error } =
        await getSupabaseBrowserClient().auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
      // supabase-js resolves with the error instead of throwing it.
      if (error) throw error;
      return data;
    },
    onError: (error: AuthError) => {
      toast({ ...describe(error), duration: 5000, variant: "destructive" });
    },
    onSuccess: async () => {
      // Warms the identity before navigating, so the shell renders with roles
      // already in hand instead of flashing an empty menu.
      await queryClient.prefetchQuery({
        queryKey: authMeQueryKey,
        queryFn: GetAuthMeFetcher,
      });
      // replace, not push: Back should not return to the login screen.
      router.replace("/pedidos");
    },
  });

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    loginMutate.mutate(data);
  };

  return {
    form,
    loginMutateIsLoading: loginMutate.isPending,
    onSubmit,
  };
};
