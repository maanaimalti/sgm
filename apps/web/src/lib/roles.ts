import type { Role } from "@sgm/shared";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  manager: "Gerente",
  kitchen: "Cozinha",
  buyer: "Compras",
};

const LABEL_PRIORITY: Role[] = ["admin", "manager", "kitchen", "buyer"];

/** The single role shown next to a user's name when they hold several. */
export function roleLabel(roles: Role[] | undefined): string {
  if (!roles?.length) return "";
  const primary = LABEL_PRIORITY.find((role) => roles.includes(role));
  return primary ? ROLE_LABELS[primary] : roles[0];
}
