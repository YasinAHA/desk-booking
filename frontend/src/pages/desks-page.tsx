import { useMemo, useState } from "react";
import { ApiError } from "../shared/api/api-error";
import { useDesksQuery } from "../features/desks/queries/use-desks-query";
import { useAuthSession } from "../features/auth/model/use-auth-session";
import { useMyReservationsQuery } from "../features/reservations/queries/use-my-reservations-query";
import { useCreateReservationMutation } from "../features/reservations/mutations/use-create-reservation-mutation";
import { useCancelReservationMutation } from "../features/reservations/mutations/use-cancel-reservation-mutation";
import { mapReservationErrorToMessage } from "../features/reservations/model/reservations-error-messages";
import type { CreateReservationRequest } from "../features/reservations/api/reservations-api";
import { useQrCheckInMutation } from "../features/qr-checkin/mutations/use-qr-checkin-mutation";
import { mapQrCheckInErrorToMessage } from "../features/qr-checkin/model/qr-checkin-error-messages";
import { useAdminDesksQuery } from "../features/admin-qr/queries/use-admin-desks-query";
import { useRegenerateDeskQrMutation } from "../features/admin-qr/mutations/use-regenerate-desk-qr-mutation";
import { useRegenerateAllDeskQrMutation } from "../features/admin-qr/mutations/use-regenerate-all-desk-qr-mutation";
import { buildDeskQrImageUrl } from "../features/admin-qr/model/admin-qr-utils";

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
  const [qrPublicId, setQrPublicId] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const desksQuery = useDesksQuery(date, isAuthenticated);
  const reservationsQuery = useMyReservationsQuery(isAuthenticated);
  const createReservationMutation = useCreateReservationMutation(date);
  const cancelReservationMutation = useCancelReservationMutation(date);
  const qrCheckInMutation = useQrCheckInMutation(date);
  const adminDesksQuery = useAdminDesksQuery(isAuthenticated);
  const regenerateDeskQrMutation = useRegenerateDeskQrMutation();
  const regenerateAllDeskQrMutation = useRegenerateAllDeskQrMutation();

  const desks = useMemo(() => desksQuery.data?.items ?? [], [desksQuery.data]);
  const reservations = useMemo(
    () => reservationsQuery.data?.items ?? [],
    [reservationsQuery.data]
  );
  const adminDesks = useMemo(
    () => adminDesksQuery.data?.items ?? [],
    [adminDesksQuery.data]
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

  const onQrCheckIn = async () => {
    const trimmedQrPublicId = qrPublicId.trim();
    if (!trimmedQrPublicId) {
      setActionError("Introduce el codigo QR publico.");
      return;
    }

    setActionError(null);
    setActionMessage(null);

    try {
      const result = await qrCheckInMutation.mutateAsync({
        date,
        qrPublicId: trimmedQrPublicId
      });
      setQrPublicId("");
      if (result.status === "already_checked_in") {
        setActionMessage("Ya estabas en estado check-in para esta reserva.");
      } else {
        setActionMessage("Check-in confirmado.");
      }
    } catch (error) {
      setActionError(
        mapQrCheckInErrorToMessage(error, "No se pudo completar el check-in.")
      );
    }
  };

  const onRegenerateDeskQr = async (deskId: string, deskCode: string) => {
    setActionError(null);
    setActionMessage(null);

    try {
      await regenerateDeskQrMutation.mutateAsync(deskId);
      setActionMessage(`QR regenerado para ${deskCode}.`);
    } catch (error) {
      setActionError(
        mapReservationErrorToMessage(error, "No se pudo regenerar el QR del desk.")
      );
    }
  };

  const onRegenerateAllDeskQr = async () => {
    setActionError(null);
    setActionMessage(null);

    try {
      const result = await regenerateAllDeskQrMutation.mutateAsync();
      setActionMessage(`QR regenerados: ${result.updated}.`);
    } catch (error) {
      setActionError(
        mapReservationErrorToMessage(error, "No se pudieron regenerar todos los QR.")
      );
    }
  };

  const isMutating =
    createReservationMutation.isPending ||
    cancelReservationMutation.isPending ||
    qrCheckInMutation.isPending ||
    regenerateDeskQrMutation.isPending ||
    regenerateAllDeskQrMutation.isPending;

  const desksErrorMessage =
    desksQuery.error instanceof ApiError
      ? desksQuery.error.message
      : "Error cargando escritorios.";

  const reservationsErrorMessage =
    reservationsQuery.error instanceof ApiError
      ? reservationsQuery.error.message
      : "Error cargando reservas.";
  const isAdminForbidden =
    adminDesksQuery.error instanceof ApiError &&
    adminDesksQuery.error.code === "FORBIDDEN";
  const adminDesksErrorMessage =
    adminDesksQuery.error instanceof ApiError
      ? adminDesksQuery.error.message
      : "Error cargando desks de administracion.";

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

      <section className="card">
        <h2>Check-in QR</h2>
        <p className="muted-text">
          Introduce el codigo QR publico del escritorio para hacer check-in.
        </p>
        <div className="toolbar">
          <label htmlFor="qr-public-id">QR publico</label>
          <input
            id="qr-public-id"
            type="text"
            value={qrPublicId}
            onChange={event => setQrPublicId(event.target.value)}
            placeholder="qr_public_id"
          />
          <button
            type="button"
            disabled={qrCheckInMutation.isPending}
            onClick={() => {
              void onQrCheckIn();
            }}
          >
            {qrCheckInMutation.isPending ? "Procesando..." : "Confirmar check-in"}
          </button>
        </div>
      </section>

      {!isAdminForbidden ? (
        <section className="card">
          <h2>Admin QR</h2>
          <p className="muted-text">
            Gestion basica de QR por escritorio (listar y regenerar).
          </p>
          <div className="toolbar">
            <button
              type="button"
              className="ghost-button"
              disabled={regenerateAllDeskQrMutation.isPending}
              onClick={() => {
                void onRegenerateAllDeskQr();
              }}
            >
              {regenerateAllDeskQrMutation.isPending
                ? "Regenerando..."
                : "Regenerar QR de todos"}
            </button>
          </div>
          {adminDesksQuery.isPending ? <p>Cargando desks admin...</p> : null}
          {adminDesksQuery.isError ? (
            <p className="error-text">{adminDesksErrorMessage}</p>
          ) : null}
          {!adminDesksQuery.isPending &&
          !adminDesksQuery.isError &&
          adminDesks.length === 0 ? (
            <p>No hay desks para administrar.</p>
          ) : null}
          {!adminDesksQuery.isPending &&
          !adminDesksQuery.isError &&
          adminDesks.length > 0 ? (
            <ul className="admin-qr-grid">
              {adminDesks.map(item => (
                <li key={item.id} className="admin-qr-card">
                  <p className="reservation-main">{item.code}</p>
                  <p className="muted-text">{item.name ?? "Sin nombre"}</p>
                  <p className="muted-text">Estado: {item.status}</p>
                  <img
                    className="admin-qr-image"
                    src={buildDeskQrImageUrl(item.qrPublicId)}
                    alt={`QR ${item.code}`}
                  />
                  <code className="admin-qr-token">{item.qrPublicId}</code>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={regenerateDeskQrMutation.isPending}
                    onClick={() => {
                      void onRegenerateDeskQr(item.id, item.code);
                    }}
                  >
                    {regenerateDeskQrMutation.isPending
                      ? "Regenerando..."
                      : "Regenerar QR"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
