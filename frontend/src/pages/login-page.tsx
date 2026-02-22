import { useState } from "react";

import { Building2, Eye, EyeOff } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { ApiError } from "@shared/api/api-error";
import { Alert } from "@shared/ui/Alert";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { Input } from "@shared/ui/Input";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_CREDENTIALS") {
      return "Credenciales inválidas.";
    }
    if (error.code === "EMAIL_NOT_CONFIRMED") {
      return "Tu email aún no está confirmado.";
    }
  }

  return "No se pudo iniciar sesión.";
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { isAuthenticated, signIn } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/desks" replace />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
      await navigate("/desks");
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-secondary">Accede a tu cuenta de DeskFlow</p>
        </div>

        <form
          className="grid gap-4"
          onSubmit={event => {
            void onSubmit(event);
          }}
        >
          <label htmlFor="email" className="text-sm font-medium text-secondary">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password" className="text-sm font-medium text-secondary">
            Contraseña
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="pr-10"
              required
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

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-accent hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Iniciando..." : "Iniciar sesión"}
          </Button>

          <p className="text-center text-sm text-secondary">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="font-medium text-accent hover:underline">
              Regístrate
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
