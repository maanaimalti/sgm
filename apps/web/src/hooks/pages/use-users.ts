import { useToast } from "@/components/ui/use-toast";
import { GetAllUsersFetcher } from "@/data/fetchers/users/get-all";
import { resetUserPasswordMutation } from "@/data/mutations/reset-user-password";
import {
  type ResetPasswordForm,
  resetPasswordSchema,
} from "@/data/schemas/password-schema";
import { useDebounce } from "@/hooks/use-debounce";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserListItem } from "@sgm/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export const useUsersPage = () => {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [target, setTarget] = useState<UserListItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: GetAllUsersFetcher,
  });

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const resetPassword = useMutation({
    mutationFn: ({ newPassword }: ResetPasswordForm) =>
      resetUserPasswordMutation({
        userId: target?.id ?? "",
        newPassword,
      }),
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: "Erro ao redefinir a senha",
        description:
          error?.response?.data?.message ?? "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Senha redefinida",
        description: `${target?.name} precisará entrar novamente com a nova senha.`,
      });
      closeReset();
    },
  });

  const openReset = (user: UserListItem) => {
    form.reset({ newPassword: "", confirmPassword: "" });
    setTarget(user);
  };

  const closeReset = () => {
    setTarget(null);
    form.reset({ newPassword: "", confirmPassword: "" });
  };

  const users = useMemo(() => {
    const all = data ?? [];
    if (!debouncedQ) return all;
    const needle = debouncedQ.toLowerCase();
    return all.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        user.username.toLowerCase().includes(needle),
    );
  }, [data, debouncedQ]);

  return {
    users,
    total: data?.length ?? 0,
    isLoading,
    q,
    setQ,
    form,
    resetTarget: target,
    openReset,
    closeReset,
    isResetting: resetPassword.isPending,
    onSubmitReset: form.handleSubmit((values) => resetPassword.mutate(values)),
  };
};
