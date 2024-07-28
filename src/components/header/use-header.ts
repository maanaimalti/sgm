import { usePathname, useRouter } from "next/navigation";

export const useHeader = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.push("/");
  };

  return {
    handleLogout,
    pathname
  };
}