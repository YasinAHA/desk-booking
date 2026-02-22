import { useState } from "react";

import { Building2, Eye, EyeOff } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { Alert } from "@shared/ui/Alert";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { Input } from "@shared/ui/Input";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";

export function RegisterPage(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Crear cuenta</h2>
          <p className="mt-1 text-sm text-secondary">
            Regístrate para empezar a reservar en DeskFlow.
          </p>
        </div>

        <form className="grid gap-4">
          <label htmlFor="register-name" className="text-sm font-medium text-secondary">
            Nombre completo
          </label>
          <Input id="register-name" type="text" placeholder="María Rodríguez" disabled />

          <label htmlFor="register-email" className="text-sm font-medium text-secondary">
            Email
          </label>
          <Input id="register-email" type="email" placeholder="tu@empresa.com" disabled />

          <label htmlFor="register-password" className="text-sm font-medium text-secondary">
            Contraseña
          </label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pr-10"
              disabled
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
              onClick={() => setShowPassword(current => !current)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Alert variant="warning">Próximamente: registro conectado a backend.</Alert>

          <Button type="button" className="w-full" disabled>
            Crear cuenta
          </Button>

          <p className="text-center text-sm text-secondary">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
