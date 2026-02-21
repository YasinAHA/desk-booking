import { Link } from "react-router-dom";

export function NotFoundPage(): JSX.Element {
  return (
    <section className="card">
      <h2>Not Found</h2>
      <p>La ruta solicitada no existe.</p>
      <Link to="/login">Ir a login</Link>
    </section>
  );
}
