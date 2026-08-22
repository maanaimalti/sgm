import { useToast } from "@/components/ui/use-toast";
import { GetAllDepartmentsFetcher } from "@/data/fetchers/departments/get-all";
import { newUserMutation } from "@/data/mutations/new-user";
import {
  type CreateUserForm,
  createUserSchema,
} from "@/data/schemas/user-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export const useNewUser = () => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: GetAllDepartmentsFetcher,
  });

  const createUser = useMutation({
    mutationKey: ["create-user"],
    mutationFn: newUserMutation,
    onError: (error: AxiosError<{ message?: string }>) => {
      const isConflict = error?.response?.status === 409;
      toast({
        title: isConflict ? "Usuário já existe" : "Erro ao criar usuário",
        description:
          error?.response?.data?.message ?? "Tente novamente mais tarde",
        duration: 5000,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuário criado com sucesso",
        description: "Entregue a senha inicial para essa pessoa.",
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/usuarios");
    },
  });

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      roles: [],
      departmentIds: [],
    },
  });

  const onSubmit = (data: CreateUserForm) => {
    createUser.mutate(data);
  };

  return {
    form,
    departments: departmentsQuery.data ?? [],
    departmentsIsLoading: departmentsQuery.isLoading,
    createUserIsLoading: createUser.isPending,
    onSubmit: form.handleSubmit(onSubmit),
  };
};
