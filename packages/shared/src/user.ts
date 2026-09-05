import type { Role } from "./auth";

export interface UserListItem {
  id: string;
  name: string;
  username: string;
  email: string | null;
  roles: Role[];
  departments: {
    id: string;
    name: string;
  }[];
  /** Invited but has not chosen a password yet — drives the "convite pendente" badge. */
  mustSetPassword: boolean;
}
