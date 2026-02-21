import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { login, logout, type LoginRequest } from "../api/auth-api";
import {
  clearStoredTokens,
  getStoredTokens,
  onStoredSessionChange,
  setStoredTokens
} from "../../../shared/auth/session-storage";
import { AuthSessionContext } from "./auth-session-context";
import type { AuthSessionState } from "./auth-session-types";

type AuthSessionProviderProps = {
  children: ReactNode;
};

export function AuthSessionProvider({
  children
}: AuthSessionProviderProps): JSX.Element {
  const [state, setState] = useState<AuthSessionState>({
    user: null,
    isAuthenticated: false,
    isBootstrapping: true
  });

  useEffect(() => {
    const stored = getStoredTokens();
    setState({
      user: null,
      isAuthenticated: Boolean(stored?.accessToken),
      isBootstrapping: false
    });

    const unsubscribe = onStoredSessionChange(() => {
      const next = getStoredTokens();
      setState(current => ({
        ...current,
        isAuthenticated: Boolean(next?.accessToken),
        user: next?.accessToken ? current.user : null
      }));
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (payload: LoginRequest) => {
    const result = await login(payload);
    setStoredTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
    setState({
      user: result.user,
      isAuthenticated: true,
      isBootstrapping: false
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      clearStoredTokens();
      setState({
        user: null,
        isAuthenticated: false,
        isBootstrapping: false
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut
    }),
    [state, signIn, signOut]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
