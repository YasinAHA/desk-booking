import { CalendarDays, LayoutGrid, LogOut, QrCode, ShieldCheck } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { ApiError } from "@shared/api/api-error";

import { useAdminDesksQuery } from "@features/admin-qr/queries/use-admin-desks-query";
import { useAuthSession } from "@features/auth/model/session/use-auth-session";

type NavItem = {
  to: string;
  label: string;
  icon: JSX.Element;
};

const baseNavItems: NavItem[] = [
  { to: "/desks", label: "Desks", icon: <LayoutGrid className="h-4 w-4" /> },
  {
    to: "/reservations",
    label: "My Bookings",
    icon: <CalendarDays className="h-4 w-4" />
  },
  { to: "/check-in", label: "Check-in", icon: <QrCode className="h-4 w-4" /> }
];

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function AppSidebar(): JSX.Element {
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated } = useAuthSession();
  const adminAccessQuery = useAdminDesksQuery(isAuthenticated);
  const isAdminForbidden =
    adminAccessQuery.error instanceof ApiError &&
    adminAccessQuery.error.code === "FORBIDDEN";

  const showAdminLink = Boolean(adminAccessQuery.data) && !isAdminForbidden;

  const onLogout = async () => {
    await signOut();
    await navigate("/login");
  };

  const navItems = showAdminLink
    ? [
        ...baseNavItems,
        {
          to: "/admin/desks",
          label: "Admin",
          icon: <ShieldCheck className="h-4 w-4" />
        }
      ]
    : baseNavItems;

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-white">
      <div className="px-6 py-6">
        <h1 className="font-heading text-xl font-bold text-white">DeskFlow</h1>
        <p className="text-xs text-white/65">Enterprise Booking</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive
                ? "flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white"
                : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
            {user ? getInitials(user.firstName, user.lastName) : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user ? `${user.firstName} ${user.lastName}` : "Usuario"}
            </p>
            <p className="truncate text-xs text-white/65">{user?.email ?? ""}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void onLogout();
            }}
            className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

