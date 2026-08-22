import { useToast } from "@/components/ui/use-toast";
import { authMeQueryKey } from "@/data/fetchers/auth/me";
import { GetAllDepartmentsFetcher } from "@/data/fetchers/departments/get-all";
import { updateUserMutation } from "@/data/mutations/update-user";
import {
  type UpdateUserForm,
  updateUserSchema,
} from "@/data/schemas/user-schema";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserListItem } from "@sgm/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useForm } from "react-hook-form";

const EMPTY: UpdateUserForm = { name: "", roles: [], departmentIds: [] };

const toFormValues = (user: UserListItem | null): UpdateUserForm =>
  user
    ? {
        name: user.name,
        roles: user.roles,
        departmentIds: user.departments.map((department) => department.id),
      }
    : EMPTY;

export const useEditUser = (
  user: UserListItem | null,
  onSuccess: () => void,
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: GetAllDepartmentsFetcher,
  });

  // `values` and not just `defaultValues`: the dialog is mounted once and
  // re-targeted at a different row, so the form has to re-sync on every open.
  const form = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: EMPTY,
    values: toFormValues(user),
  });

  const editUser = useMutation({
    mutationKey: ["edit-user"],
    mutationFn: (values: UpdateUserForm) =>
      updateUserMutation({ userId: user?.id ?? "", ...values }),
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: "Erro ao editar usuário",
        description:
          error?.response?.data?.message ?? "Tente novamente mais tarde",
        duration: 5000,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuário atualizado",
        description: `Os dados de ${user?.name} foram salvos.`,
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Papéis and setores drive the menu, so editing yourself has to refresh
      // the identity the shell renders from.
      if (user?.id === currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: authMeQueryKey });
      }
      onSuccess();
    },
  });

  return {
    form,
    departments: departmentsQuery.data ?? [],
    departmentsIsLoading: departmentsQuery.isLoading,
    isEditingSelf: user !== null && user.id === currentUser?.id,
    editUserIsLoading: editUser.isPending,
    onSubmit: form.handleSubmit((values) => editUser.mutate(values)),
  };
};
