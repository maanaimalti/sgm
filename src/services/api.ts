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
