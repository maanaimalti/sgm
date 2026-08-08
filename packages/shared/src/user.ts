export interface UserListItem {
  id: string;
  name: string;
  username: string;
  roles: string[];
  departments: {
    id: string;
    name: string;
  }[];
}
