export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: User;
}
