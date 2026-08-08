/**
 * The four roles seeded by `apps/api/prisma/seed.ts`. Until now they existed
 * only as string literals scattered across both apps; this is the enumeration.
 */
export const ROLES = ["admin", "kitchen", "buyer", "manager"] as const;

export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  roles: Role[];
  departments: {
    id: string;
    name: string;
  }[];
}

export interface CreateUserPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  roles: Role[];
  departmentIds: string[];
}

export interface UpdateUserPayload {
  name?: string;
  roles?: Role[];
  departmentIds?: string[];
}

export interface UpdateUserEmailPayload {
  email: string;
}

/**
 * Users migrated from the username-only era get an address on a domain the
 * organisation controls, because Supabase Auth requires one per account. No
 * mailbox exists behind it — anything sent there bounces — so these are meant
 * to be replaced through the users screen, and `isPlaceholderEmail` is how the
 * UI finds the ones still waiting.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = "@sgm.icmalagoas.org.br";

export const isPlaceholderEmail = (email: string | null | undefined): boolean =>
  !!email && email.toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);
