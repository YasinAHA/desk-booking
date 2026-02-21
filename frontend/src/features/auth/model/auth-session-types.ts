import type { LoginRequest } from "../api/auth-api";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
};

export type AuthSessionState = {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
};

export type AuthSessionContextValue = AuthSessionState & {
  signIn: (payload: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
};
