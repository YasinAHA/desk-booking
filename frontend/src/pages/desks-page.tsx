import { useMemo, useState } from "react";
import { useAuthSession } from "../features/auth/model/use-auth-session";
import { useAdminDesksQuery } from "../features/admin-qr/queries/use-admin-desks-query";
import type { AdminDeskItem } from "../features/admin-qr/api/admin-qr-api";
import { useRegenerateAllDeskQrMutation } from "../features/admin-qr/mutations/use-regenerate-all-desk-qr-mutation";
import { useRegenerateDeskQrMutation } from "../features/admin-qr/mutations/use-regenerate-desk-qr-mutation";
import { buildDeskQrImageUrl } from "../features/admin-qr/model/admin-qr-utils";
import { useDesksQuery } from "../features/desks/queries/use-desks-query";
import type { DesksResponse } from "../features/desks/api/desks-api";
import { mapQrCheckInErrorToMessage } from "../features/qr-checkin/model/qr-checkin-error-messages";
import { useQrCheckInMutation } from "../features/qr-checkin/mutations/use-qr-checkin-mutation";
import type {
  CreateReservationRequest,
  ReservationItem
} from "../features/reservations/api/reservations-api";
import { mapReservationErrorToMessage } from "../features/reservations/model/reservations-error-messages";
import { useCreateReservationMutation } from "../features/reservations/mutations/use-create-reservation-mutation";
import { useCancelReservationMutation } from "../features/reservations/mutations/use-cancel-reservation-mutation";
import { useMyReservationsQuery } from "../features/reservations/queries/use-my-reservations-query";
import { ApiError } from "../shared/api/api-error";
import { Alert } from "../shared/ui/Alert";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";

type PageFeedback = {
  message: string | null;
  error: string | null;
};
type DeskItem = DesksResponse["items"][number];

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

function getReserveLabel(isMine: boolean, isReserved: boolean): string {
  if (isMine) {
    return "Reservado por ti";
  }
  if (isReserved) {
    return "No disponible";
  }
  return "Reservar";
}

function getDeskStatusBadgeVariant(status: "active" | "maintenance" | "disabled") {
  if (status === "active") {
    return "success" as const;
  }
  if (status === "maintenance") {
    return "warning" as const;
  }
  return "destructive" as const;
}

type DesksSectionProps = {
  date: string;
  isFetching: boolean;
  isPending: boolean;
  isError: boolean;
  errorMessage: string;
  desks: DeskItem[];
  isMutating: boolean;
  onDateChange: (value: string) => void;
  onReserve: (payload: CreateReservationRequest) => Promise<void>;
};

function DesksSection({
  date,
  isFetching,
  isPending,
  isError,
  errorMessage,
  desks,
  isMutating,
  onDateChange,
  onReserve
}: Readonly<DesksSectionProps>): JSX.Element {
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-[22px] font-semibold text-foreground">Desks</h2>
        <p className="text-sm text-muted">Gestiona reservas por fecha.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <label htmlFor="desk-date" className="text-sm font-medium text-secondary">
            Fecha
          </label>
          <Input
            id="desk-date"
            type="date"
            value={date}
            onChange={event => onDateChange(event.target.value)}
            className="w-45"
          />
        </div>
        {isFetching ? (
          <Badge variant="info" className="h-6">
            Actualizando...
          </Badge>
        ) : null}
      </div>

      {isPending ? <Alert variant="default">Cargando escritorios...</Alert> : null}
      {isError ? <Alert variant="error">{errorMessage}</Alert> : null}
      {!isPending && !isError && desks.length === 0 ? (
        <Alert variant="default">No hay escritorios disponibles para esa fecha.</Alert>
      ) : null}

      {!isPending && !isError && desks.length > 0 ? (
        <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 p-0">
          {desks.map(desk => {
            const canReserve = desk.status === "active" && !desk.isReserved && !isMutating;
            const reserveLabel = getReserveLabel(desk.isMine, desk.isReserved);
            return (
              <li
                key={desk.id}
                className="grid gap-2 rounded-(--radius-card) border border-border bg-surface-muted p-3 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-medium text-foreground">{desk.code}</h3>
                  <Badge variant={getDeskStatusBadgeVariant(desk.status)}>
                    {desk.status}
                  </Badge>
                </div>
                <p className="text-sm text-secondary">{desk.name ?? "Sin nombre"}</p>
                <p className="text-sm text-muted">
                  {getDeskStatusLabel(desk.isReserved, desk.isMine)}
                </p>
                <Button
                  variant={canReserve ? "primary" : "secondary"}
                  disabled={!canReserve}
                  onClick={() => {
                    void onReserve({
                      date,
                      deskId: desk.id,
                      officeId: desk.officeId,
                      source: "user"
                    });
                  }}
                >
                  {reserveLabel}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}

type ReservationsSectionProps = {
  isPending: boolean;
  isError: boolean;
  errorMessage: string;
  isMutating: boolean;
  reservations: ReservationItem[];
  onCancel: (reservationId: string) => Promise<void>;
};

function ReservationsSection({
  isPending,
  isError,
  errorMessage,
  isMutating,
  reservations,
  onCancel
}: Readonly<ReservationsSectionProps>): JSX.Element {
  return (
    <Card className="space-y-4">
      <h2 className="text-[22px] font-semibold text-foreground">Mis reservas</h2>
      {isPending ? <Alert variant="default">Cargando reservas...</Alert> : null}
      {isError ? <Alert variant="error">{errorMessage}</Alert> : null}
      {!isPending && !isError && reservations.length === 0 ? (
        <Alert variant="default">No tienes reservas activas.</Alert>
      ) : null}
      {!isPending && !isError && reservations.length > 0 ? (
        <ul className="grid list-none gap-3 p-0">
          {reservations.map(item => {
            const isCancelled = item.cancelledAt !== null;
            return (
              <li
                key={item.reservationId}
                className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-border bg-surface-muted p-3"
              >
                <div className="grid gap-1">
                  <p className="text-sm font-semibold text-foreground">
                    {item.reservationDate}
                  </p>
                  <p className="text-sm text-muted">{item.deskName}</p>
                </div>
                <Button
                  variant="secondary"
                  disabled={isMutating || isCancelled}
                  onClick={() => {
                    void onCancel(item.reservationId);
                  }}
                >
                  {isCancelled ? "Cancelada" : "Cancelar"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}

type CheckInSectionProps = {
  qrPublicId: string;
  isPending: boolean;
  onQrValueChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

function CheckInSection({
  qrPublicId,
  isPending,
  onQrValueChange,
  onSubmit
}: Readonly<CheckInSectionProps>): JSX.Element {
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-[22px] font-semibold text-foreground">Check-in QR</h2>
        <p className="text-sm text-muted">
          Introduce el codigo QR publico del escritorio para hacer check-in.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-55 gap-2">
          <label htmlFor="qr-public-id" className="text-sm font-medium text-secondary">
            QR publico
          </label>
          <Input
            id="qr-public-id"
            type="text"
            value={qrPublicId}
            onChange={event => onQrValueChange(event.target.value)}
            placeholder="qr_public_id"
          />
        </div>
        <Button
          disabled={isPending}
          onClick={() => {
            void onSubmit();
          }}
        >
          {isPending ? "Procesando..." : "Confirmar check-in"}
        </Button>
      </div>
    </Card>
  );
}

type AdminQrSectionProps = {
  isPending: boolean;
  isError: boolean;
  errorMessage: string;
  isRegeneratingAll: boolean;
  isRegeneratingOne: boolean;
  items: AdminDeskItem[];
  onRegenerateAll: () => Promise<void>;
  onRegenerateOne: (deskId: string, deskCode: string) => Promise<void>;
};

function AdminQrSection({
  isPending,
  isError,
  errorMessage,
  isRegeneratingAll,
  isRegeneratingOne,
  items,
  onRegenerateAll,
  onRegenerateOne
}: Readonly<AdminQrSectionProps>): JSX.Element {
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-[22px] font-semibold text-foreground">Admin QR</h2>
        <p className="text-sm text-muted">
          Gestion basica de QR por escritorio (listar y regenerar).
        </p>
      </div>
      <div>
        <Button
          variant="secondary"
          disabled={isRegeneratingAll}
          onClick={() => {
            void onRegenerateAll();
          }}
        >
          {isRegeneratingAll ? "Regenerando..." : "Regenerar QR de todos"}
        </Button>
      </div>
      {isPending ? <Alert variant="default">Cargando desks admin...</Alert> : null}
      {isError ? <Alert variant="error">{errorMessage}</Alert> : null}
      {!isPending && !isError && items.length === 0 ? (
        <Alert variant="default">No hay desks para administrar.</Alert>
      ) : null}
      {!isPending && !isError && items.length > 0 ? (
        <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 p-0">
          {items.map(item => (
            <li
              key={item.id}
              className="grid gap-2 rounded-(--radius-card) border border-border bg-surface-muted p-3"
            >
              <p className="text-sm font-semibold text-foreground">{item.code}</p>
              <p className="text-sm text-muted">{item.name ?? "Sin nombre"}</p>
              <Badge variant={getDeskStatusBadgeVariant(item.status)}>{item.status}</Badge>
              <img
                className="h-30 w-30 object-contain"
                src={buildDeskQrImageUrl(item.qrPublicId)}
                alt={`QR ${item.code}`}
              />
              <code className="break-all text-xs text-secondary">{item.qrPublicId}</code>
              <Button
                variant="secondary"
                disabled={isRegeneratingOne}
                onClick={() => {
                  void onRegenerateOne(item.id, item.code);
                }}
              >
                {isRegeneratingOne ? "Regenerando..." : "Regenerar QR"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function useDesksPageFeedback() {
  const [feedback, setFeedback] = useState<PageFeedback>({
    message: null,
    error: null
  });

  const clear = () => {
    setFeedback({
      message: null,
      error: null
    });
  };

  const setError = (error: string) => {
    setFeedback({
      message: null,
      error
    });
  };

  const setMessage = (message: string) => {
    setFeedback({
      message,
      error: null
    });
  };

  return {
    feedback,
    clear,
    setError,
    setMessage
  };
}

export function DesksPage(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const [date, setDate] = useState(() => getTodayDate());
  const [qrPublicId, setQrPublicId] = useState("");
  const { feedback, clear, setError, setMessage } = useDesksPageFeedback();

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

  const desksErrorMessage =
    desksQuery.error instanceof ApiError
      ? desksQuery.error.message
      : "Error cargando escritorios.";
  const reservationsErrorMessage =
    reservationsQuery.error instanceof ApiError
      ? reservationsQuery.error.message
      : "Error cargando reservas.";
  const adminDesksErrorMessage =
    adminDesksQuery.error instanceof ApiError
      ? adminDesksQuery.error.message
      : "Error cargando desks de administracion.";

  const isAdminForbidden =
    adminDesksQuery.error instanceof ApiError &&
    adminDesksQuery.error.code === "FORBIDDEN";
  const showAdminSection = !isAdminForbidden;

  const isMutating =
    createReservationMutation.isPending ||
    cancelReservationMutation.isPending ||
    qrCheckInMutation.isPending ||
    regenerateDeskQrMutation.isPending ||
    regenerateAllDeskQrMutation.isPending;

  const onDateChange = (nextDate: string) => {
    setDate(nextDate);
    clear();
  };

  const onCreateReservation = async (payload: CreateReservationRequest) => {
    clear();
    try {
      await createReservationMutation.mutateAsync(payload);
      setMessage("Reserva creada correctamente.");
    } catch (error) {
      setError(mapReservationErrorToMessage(error, "No se pudo crear la reserva."));
    }
  };

  const onCancelReservation = async (reservationId: string) => {
    if (!globalThis.confirm("Quieres cancelar esta reserva?")) {
      return;
    }

    clear();
    try {
      await cancelReservationMutation.mutateAsync(reservationId);
      setMessage("Reserva cancelada correctamente.");
    } catch (error) {
      setError(
        mapReservationErrorToMessage(error, "No se pudo cancelar la reserva.")
      );
    }
  };

  const onQrCheckIn = async () => {
    const trimmedQrPublicId = qrPublicId.trim();
    if (!trimmedQrPublicId) {
      setError("Introduce el codigo QR publico.");
      return;
    }

    clear();
    try {
      const result = await qrCheckInMutation.mutateAsync({
        date,
        qrPublicId: trimmedQrPublicId
      });
      setQrPublicId("");
      if (result.status === "already_checked_in") {
        setMessage("Ya estabas en estado check-in para esta reserva.");
        return;
      }
      setMessage("Check-in confirmado.");
    } catch (error) {
      setError(
        mapQrCheckInErrorToMessage(error, "No se pudo completar el check-in.")
      );
    }
  };

  const onRegenerateDeskQr = async (deskId: string, deskCode: string) => {
    clear();
    try {
      await regenerateDeskQrMutation.mutateAsync(deskId);
      setMessage(`QR regenerado para ${deskCode}.`);
    } catch (error) {
      setError(
        mapReservationErrorToMessage(error, "No se pudo regenerar el QR del desk.")
      );
    }
  };

  const onRegenerateAllDeskQr = async () => {
    clear();
    try {
      const result = await regenerateAllDeskQrMutation.mutateAsync();
      setMessage(`QR regenerados: ${result.updated}.`);
    } catch (error) {
      setError(
        mapReservationErrorToMessage(error, "No se pudieron regenerar todos los QR.")
      );
    }
  };

  return (
    <div className="grid gap-4">
      {feedback.error ? <Alert variant="error">{feedback.error}</Alert> : null}
      {feedback.message ? <Alert variant="success">{feedback.message}</Alert> : null}

      <DesksSection
        date={date}
        isFetching={desksQuery.isFetching}
        isPending={desksQuery.isPending}
        isError={desksQuery.isError}
        errorMessage={desksErrorMessage}
        desks={desks}
        isMutating={isMutating}
        onDateChange={onDateChange}
        onReserve={onCreateReservation}
      />

      <ReservationsSection
        isPending={reservationsQuery.isPending}
        isError={reservationsQuery.isError}
        errorMessage={reservationsErrorMessage}
        isMutating={isMutating}
        reservations={reservations}
        onCancel={onCancelReservation}
      />

      <CheckInSection
        qrPublicId={qrPublicId}
        isPending={qrCheckInMutation.isPending}
        onQrValueChange={setQrPublicId}
        onSubmit={onQrCheckIn}
      />

      {showAdminSection ? (
        <AdminQrSection
          isPending={adminDesksQuery.isPending}
          isError={adminDesksQuery.isError}
          errorMessage={adminDesksErrorMessage}
          isRegeneratingAll={regenerateAllDeskQrMutation.isPending}
          isRegeneratingOne={regenerateDeskQrMutation.isPending}
          items={adminDesks}
          onRegenerateAll={onRegenerateAllDeskQr}
          onRegenerateOne={onRegenerateDeskQr}
        />
      ) : null}
    </div>
  );
}
