import { useToast } from "@/components/ui/use-toast";
import { loginMutation } from "@/data/mutations/login";
import { type LoginForm, loginSchema } from "@/data/schemas/login-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export const useLogin = () => {
  const { toast } = useToast();
  const router = useRouter();

  const loginMutate = useMutation({
    mutationKey: 'login',
    mutationFn: loginMutation,
    onError: (error: AxiosError) => {
      if (error?.response?.status === 401) {
        toast({
          title: "Usuario ou senha inválidos",
          description: "Verifique seu nome de usuário e senha",
          duration: 5000,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao fazer login",
          description: "Tente novamente mais tarde",
          duration: 5000,
          variant: "destructive",
        });
      }
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      router.push('/categorias');
    }
  });

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    loginMutate.mutate(data);
  };

  return {
    form,
    loginMutateIsLoading: loginMutate.isLoading,
    onSubmit,
  };
}