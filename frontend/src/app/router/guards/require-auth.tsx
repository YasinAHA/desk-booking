import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: Readonly<RequireAuthProps>): JSX.Element {
  const { isAuthenticated, isBootstrapping } = useAuthSession();

  if (isBootstrapping) {
    return <section className="card">Cargando sesion...</section>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}


