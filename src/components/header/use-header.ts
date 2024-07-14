import { useRouter } from "next/navigation";

export const useHeader = () => {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.push("/");
  };

  return {
    handleLogout,
  };
}