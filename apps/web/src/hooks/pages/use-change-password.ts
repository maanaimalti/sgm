import { useToast } from "@/components/ui/use-toast";
import { changePasswordMutation } from "@/data/mutations/change-password";
import {
  type ChangePasswordForm,
  changePasswordSchema,
} from "@/data/schemas/password-schema";
import { signOut } from "@/lib/auth/sign-out";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export const useChangePassword = (onDone?: () => void) => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordForm) =>
      changePasswordMutation({ currentPassword, newPassword }),
    onError: (error: AxiosError<{ message?: string }>) => {
      const isWrongPassword = error?.response?.status === 401;
      toast({
        title: isWrongPassword
          ? "Senha atual incorreta"
          : "Erro ao alterar a senha",
        description: isWrongPassword
          ? "Confira a senha atual e tente novamente."
          : (error?.response?.data?.message ?? "Tente novamente mais tarde"),
        variant: "destructive",
      });
    },
    onSuccess: async () => {
      // Supabase revokes the refresh token on a password change, so this
      // session is already dead — end it here instead of letting the next
      // request 401.
      await signOut(queryClient);
      onDone?.();
      toast({
        title: "Senha alterada",
        description: "Entre novamente com a nova senha.",
      });
      router.push("/");
    },
  });

  return {
    form,
    isSubmitting: mutation.isPending,
    onSubmit: form.handleSubmit((data) => mutation.mutate(data)),
  };
};
