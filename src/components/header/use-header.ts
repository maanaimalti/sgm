import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";

export const useHeader = () => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    queryClient.clear();
    router.push("/");
  };

  return {
    handleLogout,
    pathname,
  };
};
