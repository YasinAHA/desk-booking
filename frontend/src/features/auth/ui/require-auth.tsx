import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthSession } from "../model/use-auth-session";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps): JSX.Element {
  const { isAuthenticated, isBootstrapping } = useAuthSession();

  if (isBootstrapping) {
    return <section className="card">Cargando sesion...</section>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
