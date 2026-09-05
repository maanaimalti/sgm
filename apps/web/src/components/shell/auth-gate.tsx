"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Holds the shell back until the identity is known.
 *
 * GET /auth/me is one round-trip, and without this the sidebar, the bottom nav,
 * the top bar and /inicio would each render once with no roles and then correct
 * themselves. Gating once here fixes all four.
 *
 * It is also where someone who still owes a password gets sent to
 * /definir-senha — whether they arrived through an invite link or signed in
 * with a password an admin reset for them. Convenience, not security: the API
 * deliberately still answers these users, because refusing them would break
 * GET /auth/me itself and there would be no identity to gate on.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const mustSetPassword = !!user?.mustSetPassword;

  useEffect(() => {
    if (!isLoading && mustSetPassword) {
      router.replace("/definir-senha");
    }
  }, [isLoading, mustSetPassword, router]);

  // Keep the skeleton up while the redirect is in flight. Rendering the shell
  // for one frame would let every page below it fire its queries first.
  if (isLoading || mustSetPassword) {
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
