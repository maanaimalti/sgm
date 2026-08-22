import { useToast } from "@/components/ui/use-toast";
import { authMeQueryKey } from "@/data/fetchers/auth/me";
import { GetAllUsersFetcher } from "@/data/fetchers/users/get-all";
import { resendUserInviteMutation } from "@/data/mutations/resend-user-invite";
import { resetUserPasswordMutation } from "@/data/mutations/reset-user-password";
import { updateUserEmailMutation } from "@/data/mutations/update-user-email";
import {
  type ResetPasswordForm,
  resetPasswordSchema,
} from "@/data/schemas/password-schema";
import {
  type UpdateUserEmailForm,
  updateUserEmailSchema,
} from "@/data/schemas/user-schema";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { zodResolver } from "@hookform/resolvers/zod";
import { type UserListItem, isPlaceholderEmail } from "@sgm/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export const useUsersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [target, setTarget] = useState<UserListItem | null>(null);
  const [emailTarget, setEmailTarget] = useState<UserListItem | null>(null);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: GetAllUsersFetcher,
  });

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const emailForm = useForm<UpdateUserEmailForm>({
    resolver: zodResolver(updateUserEmailSchema),
    defaultValues: { email: "" },
  });

  const closeReset = () => {
    setTarget(null);
    form.reset({ newPassword: "", confirmPassword: "" });
  };

  const closeEmail = () => {
    setEmailTarget(null);
    emailForm.reset({ email: "" });
  };

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
        description: `${target?.name} entra com a nova senha e escolhe a própria em seguida.`,
      });
      // The reset also flags the user as owing a password, and the badge on
      // this screen reads that flag.
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeReset();
    },
  });

  const resendInvite = useMutation({
    mutationFn: (user: UserListItem) => resendUserInviteMutation(user.id),
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title:
          error?.response?.status === 429
            ? "Espere um pouco"
            : "Erro ao reenviar o convite",
        description:
          error?.response?.data?.message ?? "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
    onSuccess: (result, user) => {
      toast({
        title:
          result.channel === "invite"
            ? "Convite reenviado"
            : "Link de redefinição enviado",
        description:
          result.channel === "invite"
            ? `${user.name} vai receber um novo e-mail para definir a senha.`
            : `${user.name} já tinha aceitado o convite, então enviamos um link para redefinir a senha.`,
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateEmail = useMutation({
    mutationFn: ({ email }: UpdateUserEmailForm) =>
      updateUserEmailMutation({ userId: emailTarget?.id ?? "", email }),
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title:
          error?.response?.status === 409
            ? "E-mail já em uso"
            : "Erro ao trocar o e-mail",
        description:
          error?.response?.data?.message ?? "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      const changedSelf = emailTarget?.id === currentUser?.id;
      toast({
        title: "E-mail atualizado",
        description: changedSelf
          ? "Use o novo e-mail no próximo login."
          : `${emailTarget?.name} passa a entrar com o novo e-mail.`,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (changedSelf) {
        queryClient.invalidateQueries({ queryKey: authMeQueryKey });
      }
      closeEmail();
    },
  });

  const openReset = (user: UserListItem) => {
    form.reset({ newPassword: "", confirmPassword: "" });
    setTarget(user);
  };

  const openEmail = (user: UserListItem) => {
    emailForm.reset({ email: user.email ?? "" });
    setEmailTarget(user);
  };

  const openEdit = (user: UserListItem) => setEditTarget(user);

  const closeEdit = () => setEditTarget(null);

  const users = useMemo(() => {
    const all = data ?? [];
    if (!debouncedQ) return all;
    const needle = debouncedQ.toLowerCase();
    return all.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        user.username.toLowerCase().includes(needle) ||
        (user.email ?? "").toLowerCase().includes(needle),
    );
  }, [data, debouncedQ]);

  // Counted over every user, not the filtered view: the banner is a standing
  // reminder, and a search that happens to hide them all should not make it
  // look like the work is done.
  const placeholderCount = useMemo(
    () => (data ?? []).filter((user) => isPlaceholderEmail(user.email)).length,
    [data],
  );

  const pendingInviteCount = useMemo(
    () => (data ?? []).filter((user) => user.mustSetPassword).length,
    [data],
  );

  return {
    users,
    total: data?.length ?? 0,
    placeholderCount,
    pendingInviteCount,
    isLoading,
    q,
    setQ,
    form,
    resetTarget: target,
    openReset,
    closeReset,
    isResetting: resetPassword.isPending,
    onSubmitReset: form.handleSubmit((values) => resetPassword.mutate(values)),
    emailForm,
    emailTarget,
    openEmail,
    closeEmail,
    isUpdatingEmail: updateEmail.isPending,
    onSubmitEmail: emailForm.handleSubmit((values) =>
      updateEmail.mutate(values),
    ),
    editTarget,
    openEdit,
    closeEdit,
    resendInvite: (user: UserListItem) => resendInvite.mutate(user),
    resendingInviteId: resendInvite.isPending
      ? (resendInvite.variables?.id ?? null)
      : null,
  };
};
