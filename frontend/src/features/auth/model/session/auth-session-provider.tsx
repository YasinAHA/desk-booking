import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  clearStoredTokens,
  getStoredTokens,
  onStoredSessionChange,
  setStoredTokens
} from "@shared/auth/session-storage";

import { login, logout, refreshSession, verify, type LoginRequest } from "../../api/auth-api";

import { AuthSessionContext } from "./auth-session-context";

import type { AuthSessionState } from "./auth-session-types";

type AuthSessionProviderProps = {
  children: ReactNode;
};

export function AuthSessionProvider({
  children
}: Readonly<AuthSessionProviderProps>): JSX.Element {
  const [state, setState] = useState<AuthSessionState>({
    user: null,
    isAuthenticated: false,
    isBootstrapping: true
  });

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const stored = getStoredTokens();
      if (stored?.accessToken) {
        if (!cancelled) {
          setState({
            user: null,
            isAuthenticated: true,
            isBootstrapping: false
          });
        }
        return;
      }

      try {
        const session = await refreshSession();
        setStoredTokens({ accessToken: session.accessToken });
        const verified = await verify(session.accessToken);
        if (!cancelled) {
          setState({
            user: verified.user,
            isAuthenticated: true,
            isBootstrapping: false
          });
        }
      } catch {
        clearStoredTokens();
        if (!cancelled) {
          setState({
            user: null,
            isAuthenticated: false,
            isBootstrapping: false
          });
        }
      }
    };

    void bootstrap();

    const unsubscribe = onStoredSessionChange(() => {
      const next = getStoredTokens();
      setState(current => ({
        ...current,
        isAuthenticated: Boolean(next?.accessToken),
        user: next?.accessToken ? current.user : null
      }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (payload: LoginRequest) => {
    const result = await login(payload);
    setStoredTokens({
      accessToken: result.accessToken
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

