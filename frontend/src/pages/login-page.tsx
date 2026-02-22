import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../shared/api/api-error";
import { useAuthSession } from "../features/auth/model/use-auth-session";
import { Alert } from "../shared/ui/Alert";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_CREDENTIALS") {
      return "Credenciales invalidas.";
    }
    if (error.code === "EMAIL_NOT_CONFIRMED") {
      return "Tu email aun no esta confirmado.";
    }
  }

  return "No se pudo iniciar sesion.";
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { isAuthenticated, signIn } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <Card className="mx-auto w-full max-w-md">
      <h2 className="text-[22px] font-semibold text-foreground">Login</h2>
      <form
        className="mt-4 grid gap-3"
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
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password" className="text-sm font-medium text-secondary">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          required
        />

        {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}
