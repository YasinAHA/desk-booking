import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { ApiError } from "@shared/api/api-error";
import { Button } from "@shared/ui/Button";

import { useAdminDesksQuery } from "@features/admin-qr/queries/use-admin-desks-query";
import { useAuthSession } from "@features/auth/model/session/use-auth-session";

export function AppLayout(): JSX.Element {
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuthSession();
  const isGuest = !isAuthenticated;
  const adminAccessQuery = useAdminDesksQuery(isAuthenticated);
  const isAdminForbidden =
    adminAccessQuery.error instanceof ApiError &&
    adminAccessQuery.error.code === "FORBIDDEN";
  const showAdminLink =
    isAuthenticated && !isAdminForbidden && Boolean(adminAccessQuery.data);

  const onLogout = async () => {
    await signOut();
    await navigate("/login");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[--radius-card] border border-border bg-surface px-4 py-4 shadow-card">
        <h1 className="text-[28px] font-semibold text-foreground">Desk Booking</h1>
        <nav className="flex items-center gap-3">
          {isGuest ? (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-primary underline"
                  : "text-sm font-medium text-secondary hover:text-foreground"
              }
            >
              Login
            </NavLink>
          ) : null}
          {isAuthenticated ? (
            <NavLink
              to="/desks"
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-primary underline"
                  : "text-sm font-medium text-secondary hover:text-foreground"
              }
            >
              Desks
            </NavLink>
          ) : null}
          {isAuthenticated ? (
            <NavLink
              to="/reservations"
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-primary underline"
                  : "text-sm font-medium text-secondary hover:text-foreground"
              }
            >
              Reservas
            </NavLink>
          ) : null}
          {showAdminLink ? (
            <NavLink
              to="/admin/desks"
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-primary underline"
                  : "text-sm font-medium text-secondary hover:text-foreground"
              }
            >
              Admin
            </NavLink>
          ) : null}
          {isAuthenticated ? (
            <Button
              variant="secondary"
              className="h-9 px-3"
              onClick={() => {
                void onLogout();
              }}
            >
              Logout
            </Button>
          ) : null}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
