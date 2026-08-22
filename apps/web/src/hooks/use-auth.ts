"use client";

import { AuthContext } from "@/providers/auth-provider";
import { useContext } from "react";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  }
  return context;
}

/**
 * The role booleans, in the shape use-sidebar and use-orders already returned,
 * so their consumers did not have to change.
 */
export function useRoles() {
  const { user, isLoading } = useAuth();
  const roles = user?.roles ?? [];

  return {
    isAdmin: roles.includes("admin"),
    isKitchen: roles.includes("kitchen"),
    isManager: roles.includes("manager"),
    isBuyer: roles.includes("buyer"),
    isLoading,
  };
}
