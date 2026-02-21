import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../shared/api/api-error";
import { useAuthSession } from "../features/auth/model/use-auth-session";

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
    <section className="card">
      <h2>Login</h2>
      <form
        className="form-grid"
        onSubmit={event => {
          void onSubmit(event);
        }}
      >
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          required
        />

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </section>
  );
}
