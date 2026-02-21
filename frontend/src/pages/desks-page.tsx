import { useMemo, useState } from "react";
import { ApiError } from "../shared/api/api-error";
import { useDesksQuery } from "../features/desks/queries/use-desks-query";
import { useAuthSession } from "../features/auth/model/use-auth-session";
import { useMyReservationsQuery } from "../features/reservations/queries/use-my-reservations-query";
import { useCreateReservationMutation } from "../features/reservations/mutations/use-create-reservation-mutation";
import { useCancelReservationMutation } from "../features/reservations/mutations/use-cancel-reservation-mutation";
import { mapReservationErrorToMessage } from "../features/reservations/model/reservations-error-messages";
import type { CreateReservationRequest } from "../features/reservations/api/reservations-api";

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
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const desksQuery = useDesksQuery(date, isAuthenticated);
  const reservationsQuery = useMyReservationsQuery(isAuthenticated);
  const createReservationMutation = useCreateReservationMutation(date);
  const cancelReservationMutation = useCancelReservationMutation(date);

  const desks = useMemo(() => desksQuery.data?.items ?? [], [desksQuery.data]);
  const reservations = useMemo(
    () => reservationsQuery.data?.items ?? [],
    [reservationsQuery.data]
  );

  const onDateChange = (nextDate: string) => {
    setDate(nextDate);
    setActionError(null);
    setActionMessage(null);
  };

  const onCreateReservation = async (payload: CreateReservationRequest) => {
    setActionError(null);
    setActionMessage(null);

    try {
      await createReservationMutation.mutateAsync(payload);
      setActionMessage("Reserva creada correctamente.");
    } catch (error) {
      setActionError(
        mapReservationErrorToMessage(error, "No se pudo crear la reserva.")
      );
    }
  };

  const onCancelReservation = async (reservationId: string) => {
    if (!window.confirm("Quieres cancelar esta reserva?")) {
      return;
    }

    setActionError(null);
    setActionMessage(null);

    try {
      await cancelReservationMutation.mutateAsync(reservationId);
      setActionMessage("Reserva cancelada correctamente.");
    } catch (error) {
      setActionError(
        mapReservationErrorToMessage(error, "No se pudo cancelar la reserva.")
      );
    }
  };

  const isMutating =
    createReservationMutation.isPending || cancelReservationMutation.isPending;

  const desksErrorMessage =
    desksQuery.error instanceof ApiError
      ? desksQuery.error.message
      : "Error cargando escritorios.";

  const reservationsErrorMessage =
    reservationsQuery.error instanceof ApiError
      ? reservationsQuery.error.message
      : "Error cargando reservas.";

  return (
    <div className="desks-page">
      <section className="card">
        <h2>Desks</h2>
        <div className="toolbar">
          <label htmlFor="desk-date">Fecha</label>
          <input
            id="desk-date"
            type="date"
            value={date}
            onChange={event => onDateChange(event.target.value)}
          />
          {desksQuery.isFetching ? <span className="muted-text">Actualizando...</span> : null}
        </div>

        {actionError ? <p className="error-text">{actionError}</p> : null}
        {actionMessage ? <p className="success-text">{actionMessage}</p> : null}

        {desksQuery.isPending ? <p>Cargando escritorios...</p> : null}
        {desksQuery.isError ? <p className="error-text">{desksErrorMessage}</p> : null}
        {!desksQuery.isPending && !desksQuery.isError && desks.length === 0 ? (
          <p>No hay escritorios disponibles para esa fecha.</p>
        ) : null}

        {!desksQuery.isPending && !desksQuery.isError && desks.length > 0 ? (
          <ul className="desk-grid">
            {desks.map(desk => {
              const canReserve =
                desk.status === "active" && !desk.isReserved && !isMutating;
              const reserveLabel = desk.isMine
                ? "Reservado por ti"
                : desk.isReserved
                  ? "No disponible"
                  : "Reservar";

              return (
                <li
                  key={desk.id}
                  className={desk.isMine ? "desk-card desk-card-mine" : "desk-card"}
                >
                  <h3>{desk.code}</h3>
                  <p>{desk.name ?? "Sin nombre"}</p>
                  <p className="muted-text">
                    Estado: {desk.status} | {getDeskStatusLabel(desk.isReserved, desk.isMine)}
                  </p>
                  <button
                    type="button"
                    disabled={!canReserve}
                    onClick={() => {
                      void onCreateReservation({
                        date,
                        deskId: desk.id,
                        officeId: desk.officeId,
                        source: "user"
                      });
                    }}
                  >
                    {reserveLabel}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="card">
        <h2>Mis reservas</h2>
        {reservationsQuery.isPending ? <p>Cargando reservas...</p> : null}
        {reservationsQuery.isError ? (
          <p className="error-text">{reservationsErrorMessage}</p>
        ) : null}
        {!reservationsQuery.isPending &&
        !reservationsQuery.isError &&
        reservations.length === 0 ? (
          <p>No tienes reservas activas.</p>
        ) : null}
        {!reservationsQuery.isPending &&
        !reservationsQuery.isError &&
        reservations.length > 0 ? (
          <ul className="reservation-list">
            {reservations.map(item => {
              const isCancelled = item.cancelledAt !== null;
              return (
                <li key={item.reservationId} className="reservation-item">
                  <div>
                    <p className="reservation-main">{item.reservationDate}</p>
                    <p className="muted-text">{item.deskName}</p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={isMutating || isCancelled}
                    onClick={() => {
                      void onCancelReservation(item.reservationId);
                    }}
                  >
                    {isCancelled ? "Cancelada" : "Cancelar"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
