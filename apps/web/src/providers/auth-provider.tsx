"use client";

import { GetAuthMeFetcher, authMeQueryKey } from "@/data/fetchers/auth/me";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthUser } from "@sgm/shared";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useEffect, useState } from "react";

export interface AuthContextValue {
  user: AuthUser | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionResolved, setIsSessionResolved] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        setSession(data.session);
        setIsSessionResolved(true);
      });

    const { data } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);
        setIsSessionResolved(true);

        if (event === "SIGNED_OUT") {
          queryClient.clear();
        }
        if (event === "SIGNED_IN") {
          queryClient.invalidateQueries({ queryKey: authMeQueryKey });
        }
        // TOKEN_REFRESHED deliberately invalidates nothing: the access token
        // changed, the identity behind it did not.
      },
    );

    // Without this React 19's StrictMode double-mount leaves two listeners
    // behind, and every auth event is handled twice.
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: authMeQueryKey,
    queryFn: GetAuthMeFetcher,
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    // A 401 here means the session itself is bad; retrying only hammers it.
    retry: false,
  });

  const value: AuthContextValue = {
    user: meQuery.data,
    isAuthenticated: !!session,
    // Not resolved until both halves are known, so consumers never render a
    // signed-in shell with no roles — that gap is what made the menu pop.
    isLoading: !isSessionResolved || (!!session && meQuery.isPending),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
