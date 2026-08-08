import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import axios, { type InternalAxiosRequestConfig } from "axios";

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") return config;

  // getSession returns the cached session and transparently renews it when the
  // access token has expired or is about to. This is what ends the hard logout
  // that used to happen every 12 hours, mid-task.
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // No departmentId header. GetDepartmentId on the API falls back to the first
  // department on the authenticated user, which is the same value this used to
  // send, and there is no department switcher in the UI to send anything else.

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window === "undefined" || error?.response?.status !== 401) {
      return Promise.reject(error);
    }

    const original = error.config as RetriableConfig | undefined;
    const supabase = getSupabaseBrowserClient();

    // A 401 no longer means the session is over — the token may simply have
    // aged out between this interceptor and the request reaching the API. Ask
    // for a refresh once and replay.
    //
    // The _retried guard contains a failure mode this migration introduces:
    // the API now 401s when a token's subject matches no local user, and an
    // account that exists in Supabase Auth but was never provisioned here
    // would otherwise loop forever refreshing a perfectly valid token.
    if (original && !original._retried) {
      const { data, error: refreshError } =
        await supabase.auth.refreshSession();
      if (!refreshError && data.session) {
        original._retried = true;
        original.headers.Authorization = `Bearer ${data.session.access_token}`;
        return api.request(original);
      }
    }

    // Giving up. Deliberately not the shared signOut: that starts with
    // unsubscribeFromPush, which makes a request, which 401s, which lands back
    // here. The reload clears the rest.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }

    return Promise.reject(error);
  },
);
