import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { Button } from "@shared/ui/Button";

import { useAuthSession } from "@features/auth/model/use-auth-session";

export function AppLayout(): JSX.Element {
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuthSession();

  const onLogout = async () => {
    await signOut();
    await navigate("/login");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[--radius-card] border border-border bg-surface px-4 py-4 shadow-card">
        <h1 className="text-[28px] font-semibold text-foreground">Desk Booking</h1>
        <nav className="flex items-center gap-3">
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
          {isAuthenticated ? (
            <NavLink
              to="/check-in"
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-primary underline"
                  : "text-sm font-medium text-secondary hover:text-foreground"
              }
            >
              Check-in
            </NavLink>
          ) : null}
          {isAuthenticated ? (
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
