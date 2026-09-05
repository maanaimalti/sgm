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
  mustSetPassword: boolean;
}

/**
 * What the API writes into `auth.users.app_metadata`, and therefore what every
 * access token carries. Only the service role can write it — unlike
 * `user_metadata`, which the user can set themselves — which is what makes it
 * safe to authorize on, in RLS policies as well as in the API.
 *
 * Snake_case on purpose: these are JWT claims read from SQL as
 * `auth.jwt() -> 'app_metadata' ->> 'app_user_id'`, and matching the
 * convention of the surrounding claims keeps the policies readable.
 */
export interface AppMetadata {
  /** The ULID from public.users — `sub` is the Supabase UUID, which nothing else speaks. */
  app_user_id: string;
  roles: Role[];
  department_ids: string[];
}

export interface CreateUserPayload {
  name: string;
  username: string;
  email: string;
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

export interface SetPasswordPayload {
  newPassword: string;
}

export interface ResetPasswordPayload {
  newPassword: string;
  /**
   * Defaults to true on the server: a password an admin typed and then had to
   * speak aloud is a shared secret, so the person is asked to replace it on
   * their next sign-in. Send `false` only for the break-glass case where no
   * e-mail can be delivered at all.
   */
  requirePasswordChange?: boolean;
}

/**
 * Which template the resend actually used. Invites stop working once the
 * person accepts one, so the server falls back to a recovery link and the UI
 * has to say which of the two arrived.
 */
export type InviteChannel = "invite" | "recovery";

export interface ResendInviteResponse {
  ok: true;
  channel: InviteChannel;
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
