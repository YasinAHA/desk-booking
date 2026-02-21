import { createContext } from "react";
import type { AuthSessionContextValue } from "./auth-session-types";

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(
  null
);
