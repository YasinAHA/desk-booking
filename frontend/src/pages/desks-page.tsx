import { useMemo, useState } from "react";
import { ApiError } from "../shared/api/api-error";
import { useDesksQuery } from "../features/desks/queries/use-desks-query";
import { useAuthSession } from "../features/auth/model/use-auth-session";

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDeskStatusLabel(isReserved: boolean, isMine: boolean): string {
  if (!isReserved) {
    return "Libre";
  }

  if (isMine) {
    return "Reservado por ti";
  }

  return "Reservado";
}

export function DesksPage(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const [date, setDate] = useState(() => getTodayDate());
  const desksQuery = useDesksQuery(date, isAuthenticated);

  const desks = useMemo(() => desksQuery.data?.items ?? [], [desksQuery.data]);

  if (desksQuery.isLoading) {
    return (
      <section className="card">
        <h2>Desks</h2>
        <p>Cargando escritorios...</p>
      </section>
    );
  }

  if (desksQuery.isError) {
    const message =
      desksQuery.error instanceof ApiError
        ? desksQuery.error.message
        : "Error cargando escritorios";

    return (
      <section className="card">
        <h2>Desks</h2>
        <p className="error-text">{message}</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Desks</h2>
      <div className="toolbar">
        <label htmlFor="desk-date">Fecha</label>
        <input
          id="desk-date"
          type="date"
          value={date}
          onChange={event => setDate(event.target.value)}
        />
      </div>

      {desks.length === 0 ? (
        <p>No hay escritorios disponibles para esa fecha.</p>
      ) : (
        <ul className="desk-grid">
          {desks.map(desk => (
            <li key={desk.id} className={desk.isMine ? "desk-card desk-card-mine" : "desk-card"}>
              <h3>{desk.code}</h3>
              <p>{desk.name ?? "Sin nombre"}</p>
              <p className="muted-text">
                Estado: {desk.status} | {getDeskStatusLabel(desk.isReserved, desk.isMine)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
