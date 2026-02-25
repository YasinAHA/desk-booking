import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { ApiError } from "@shared/api/api-error";
import { Alert } from "@shared/ui/Alert";

import { useAdminDesksQuery } from "@features/admin-qr/queries/use-admin-desks-query";
import { useAuthSession } from "@features/auth/model/session/use-auth-session";

type RequireAdminProps = {
  children: ReactNode;
};

export function RequireAdmin({ children }: Readonly<RequireAdminProps>): JSX.Element {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const adminAccessQuery = useAdminDesksQuery(isAuthenticated);

  if (isBootstrapping) {
    return <section className="card">Cargando sesion...</section>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminAccessQuery.isPending) {
    return <section className="card">Validando permisos de administrador...</section>;
  }

  if (
    adminAccessQuery.error instanceof ApiError &&
    adminAccessQuery.error.code === "FORBIDDEN"
  ) {
    return (
      <Alert variant="error">
        No tienes permisos para acceder al panel de administracion.
      </Alert>
    );
  }

  return <>{children}</>;
}

