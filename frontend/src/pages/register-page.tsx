import { useState } from "react";

import { Building2, Eye, EyeOff } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { ApiError } from "@shared/api/api-error";
import { Alert } from "@shared/ui/Alert";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { Input } from "@shared/ui/Input";
import { useToast } from "@shared/ui/use-toast";

import { register } from "@features/auth/api/auth-api";
import { useAuthSession } from "@features/auth/model/session/use-auth-session";

function getRegisterErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "WEAK_PASSWORD") {
      return "La contraseña no cumple la política de seguridad.";
    }
    if (error.code === "DOMAIN_NOT_ALLOWED") {
      return "El dominio del email no está permitido.";
    }
    if (error.code === "INVALID_PROFILE") {
      return "Nombre o apellidos inválidos.";
    }
  }

  return "No se pudo completar el registro.";
}

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { isAuthenticated } = useAuthSession();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [secondLastName, setSecondLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        secondLastName: secondLastName.trim() ? secondLastName.trim() : undefined,
        email: email.trim().toLowerCase(),
        password
      });

      pushToast("Registro enviado. Revisa tu correo para confirmar la cuenta.", "success");
      await navigate("/login");
    } catch (error) {
      setErrorMessage(getRegisterErrorMessage(error));
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
          <h2 className="text-2xl font-semibold text-foreground">Crear cuenta</h2>
          <p className="mt-1 text-sm text-secondary">
            Regístrate para empezar a reservar en DeskFlow.
          </p>
        </div>

        <form
          className="grid gap-4"
          onSubmit={event => {
            void onSubmit(event);
          }}
        >
          <label htmlFor="register-first-name" className="text-sm font-medium text-secondary">
            Nombre
          </label>
          <Input
            id="register-first-name"
            type="text"
            placeholder="María"
            value={firstName}
            onChange={event => setFirstName(event.target.value)}
            autoComplete="given-name"
            required
          />

          <label htmlFor="register-last-name" className="text-sm font-medium text-secondary">
            Primer apellido
          </label>
          <Input
            id="register-last-name"
            type="text"
            placeholder="Rodríguez"
            value={lastName}
            onChange={event => setLastName(event.target.value)}
            autoComplete="family-name"
            required
          />

          <label
            htmlFor="register-second-last-name"
            className="text-sm font-medium text-secondary"
          >
            Segundo apellido (opcional)
          </label>
          <Input
            id="register-second-last-name"
            type="text"
            placeholder="Pérez"
            value={secondLastName}
            onChange={event => setSecondLastName(event.target.value)}
            autoComplete="additional-name"
          />

          <label htmlFor="register-email" className="text-sm font-medium text-secondary">
            Email
          </label>
          <Input
            id="register-email"
            type="email"
            placeholder="tu@empresa.com"
            autoComplete="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />

          <label htmlFor="register-password" className="text-sm font-medium text-secondary">
            Contraseña
          </label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pr-10"
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
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

          {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
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
