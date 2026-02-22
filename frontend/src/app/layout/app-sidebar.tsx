import {
  Building2,
  CalendarDays,
  Cog,
  LayoutDashboard,
  LogOut,
  MapPinned,
  QrCode,
  Shield,
  UserRound,
  Users
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { ApiError } from "@shared/api/api-error";
import { Skeleton } from "@shared/ui/Skeleton";

import { useAdminDesksQuery } from "@features/admin-qr/queries/use-admin-desks-query";
import { useAuthSession } from "@features/auth/model/session/use-auth-session";

type NavItem = {
  to?: string;
  label: string;
  icon: JSX.Element;
  disabled?: boolean;
};

const baseNavItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />
  },
  { to: "/desks", label: "Floor Map", icon: <MapPinned className="h-4 w-4" /> },
  {
    to: "/reservations",
    label: "My Bookings",
    icon: <CalendarDays className="h-4 w-4" />
  },
  { to: "/profile", label: "Profile", icon: <UserRound className="h-4 w-4" /> },
  { label: "Team", icon: <Users className="h-4 w-4" />, disabled: true },
  { label: "Settings", icon: <Cog className="h-4 w-4" />, disabled: true }
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
        { to: "/check-in", label: "Check-in", icon: <QrCode className="h-4 w-4" /> },
        { to: "/admin/desks", label: "Admin", icon: <Shield className="h-4 w-4" /> }
      ]
    : baseNavItems;

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-lg font-bold text-white">DeskFlow</h1>
          <p className="text-xs text-white/60">Enterprise Booking</p>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navItems.map(item => {
          if (item.disabled || !item.to) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60"
                aria-disabled="true"
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? "flex items-center gap-3 rounded-lg bg-white/8 px-3 py-2.5 text-sm font-medium text-accent transition-all duration-200"
                  : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/6 hover:text-white"
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <button
              type="button"
              onClick={() => {
                void navigate("/profile");
              }}
              className="min-w-0 flex-1 cursor-pointer rounded-md px-1 py-1 text-left transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              title="Go to profile"
              aria-label="Go to profile"
            >
              <p className="truncate text-sm font-medium text-white">
                {`${user.firstName} ${user.lastName}`}
              </p>
              <p className="truncate text-xs text-white/60">{user.email}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                void onLogout();
              }}
              className="cursor-pointer rounded-md p-2 text-white/50 transition-colors hover:bg-danger-soft hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-border active:scale-[0.98]"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-28 bg-white/20" />
            <Skeleton className="h-3 w-40 bg-white/15" />
          </div>
        )}
      </div>
    </aside>
  );
}
