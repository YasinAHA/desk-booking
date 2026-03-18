import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { Input } from "@shared/ui/Input";

export function ProfilePageView(): JSX.Element {
  const { user } = useAuthSession();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "-";
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "--";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="mt-1 text-sm text-muted">Gestiona tu información personal.</p>
      </div>

      <div className="grid max-w-3xl gap-6">
        <Card>
          <header className="mb-4">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Información personal
            </h2>
            <p className="mt-1 text-sm text-muted">
              Vista de cuenta actual. La edición de perfil llegará en una siguiente iteración.
            </p>
          </header>

          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#c8ced8] text-xl font-bold text-[#143a63]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-foreground">{fullName}</p>
              <p className="truncate text-sm text-secondary">{user?.email ?? "-"}</p>
            </div>
          </div>

          <form className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="profile-first-name" className="text-sm font-medium text-secondary">
                Nombre
              </label>
              <Input id="profile-first-name" value={user?.firstName ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <label htmlFor="profile-last-name" className="text-sm font-medium text-secondary">
                Primer apellido
              </label>
              <Input id="profile-last-name" value={user?.lastName ?? ""} readOnly />
            </div>
            {user?.secondLastName ? (
              <div className="space-y-2">
                <label
                  htmlFor="profile-second-last-name"
                  className="text-sm font-medium text-secondary"
                >
                  Segundo apellido
                </label>
                <Input id="profile-second-last-name" value={user.secondLastName} readOnly />
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="profile-email" className="text-sm font-medium text-secondary">
                Email
              </label>
              <Input id="profile-email" type="email" value={user?.email ?? ""} readOnly />
            </div>
            <div className="sm:col-span-2">
              <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled>
                Edición de perfil próximamente
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <header className="mb-4 flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-secondary" />
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Seguridad</h2>
              <p className="mt-1 text-sm text-muted">
                Gestiona el acceso a tu cuenta y la renovación de contraseña.
              </p>
            </div>
          </header>

          <Link to="/forgot-password">
            <Button variant="outline">Cambiar contraseña</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
