import { ArrowLeft, Building2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { Alert } from "@shared/ui/Alert";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { Input } from "@shared/ui/Input";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";

export function ForgotPasswordPage(): JSX.Element {
  const { isAuthenticated } = useAuthSession();

  if (isAuthenticated) {
    return <Navigate to="/desks" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Recuperar contraseña</h2>
          <p className="mt-1 text-sm text-secondary">
            Te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        <form className="grid gap-4">
          <label htmlFor="forgot-email" className="text-sm font-medium text-secondary">
            Email
          </label>
          <Input id="forgot-email" type="email" placeholder="tu@empresa.com" disabled />

          <Alert variant="warning">Próximamente: recuperación conectada a backend.</Alert>

          <Button type="button" className="w-full" disabled>
            Enviar enlace
          </Button>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-secondary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a login
          </Link>
        </form>
      </Card>
    </div>
  );
}
