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
}
