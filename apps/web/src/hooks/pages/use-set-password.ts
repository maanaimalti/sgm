import { useToast } from "@/components/ui/use-toast";
import { setPasswordMutation } from "@/data/mutations/set-password";
import {
  type SetPasswordForm,
  setPasswordSchema,
} from "@/data/schemas/password-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export const useSetPassword = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: setPasswordMutation,
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: "Erro ao definir a senha",
        description:
          error?.response?.data?.message ?? "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
    onSuccess: async () => {
      // Setting a password through the admin API revokes every session the
      // user has, this one included — the session is already gone by the time
      // this runs, so signing out here is bookkeeping, not a choice.
      //
      // Deliberately not the shared signOut: that starts with
      // unsubscribeFromPush(), which calls the API on a token that no longer
      // works, and the 401 interceptor would navigate away mid-mutation. An
      // invited user has no push subscription to clean up anyway.
      await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
      queryClient.clear();

      toast({
        title: "Senha definida",
        description: "Entre novamente com a sua nova senha.",
      });
      // replace, not push: the invite token is spent and going back to this
      // screen would only show an expired link.
      router.replace("/");
    },
  });

  return {
    form,
    isSubmitting: mutation.isPending,
    // Stays true through the sign-out and the redirect. Without it the page
    // would notice the session disappearing and flash "link expirado" on the
    // way out — right after a success toast.
    isDone: mutation.isSuccess,
    onSubmit: form.handleSubmit((data) => mutation.mutate(data)),
  };
};
