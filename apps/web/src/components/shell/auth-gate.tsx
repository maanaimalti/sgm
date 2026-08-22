"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

/**
 * Holds the shell back until the identity is known.
 *
 * GET /auth/me is one round-trip, and without this the sidebar, the bottom nav,
 * the top bar and /inicio would each render once with no roles and then correct
 * themselves. Gating once here fixes all four.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
