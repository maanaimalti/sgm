import { getJwtData } from "@/hooks/use-jwt";
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (config.url === "/auth/login") return config;
  if (typeof window === "undefined") return config;
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const data = getJwtData<any>(accessToken);
    const departmentId = data?.department?.[0]?.id;
    if (departmentId) {
      config.headers.departmentId = departmentId;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      const status = error?.response?.status;
      const url: string = error?.config?.url ?? "";
      if (status === 401 && !url.includes("/auth/login")) {
        localStorage.removeItem("accessToken");
        document.cookie =
          "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  },
);
