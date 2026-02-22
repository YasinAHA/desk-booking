import { useMemo, useState } from "react";

import { ApiError } from "@shared/api/api-error";
import { Alert } from "@shared/ui/Alert";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { useToast } from "@shared/ui/use-toast";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import type { ReservationItem } from "@features/reservations/api/reservations-api";
import { mapCancelReservationErrorToMessage } from "@features/reservations/model/reservations-error-messages";
import { useCancelReservationMutation } from "@features/reservations/mutations/use-cancel-reservation-mutation";
import { useMyReservationsQuery } from "@features/reservations/queries/use-my-reservations-query";

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
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

export function ReservationsPageView(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const { pushToast } = useToast();
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null);

  const reservationsQuery = useMyReservationsQuery(isAuthenticated);
  const cancelReservationMutation = useCancelReservationMutation(getTodayDate());
  const reservations = useMemo(
    () => reservationsQuery.data?.items ?? [],
    [reservationsQuery.data]
  );

  const reservationsErrorMessage =
    reservationsQuery.error instanceof ApiError
      ? reservationsQuery.error.message
      : "Error cargando reservas.";

  const onOpenCancelDialog = (reservationId: string) => {
    setReservationToCancel(reservationId);
  };

  const onCancelReservation = async (reservationId: string) => {
    try {
      await cancelReservationMutation.mutateAsync(reservationId);
      pushToast("Reserva cancelada correctamente.", "success");
    } catch (error) {
      pushToast(
        mapCancelReservationErrorToMessage(error, "No se pudo cancelar la reserva."),
        "error"
      );
    } finally {
      setReservationToCancel(null);
    }
  };

  return (
    <div className="grid gap-4">
      <ReservationsSection
        isPending={reservationsQuery.isPending}
        isError={reservationsQuery.isError}
        errorMessage={reservationsErrorMessage}
        isMutating={cancelReservationMutation.isPending}
        reservations={reservations}
        onCancel={reservationId => {
          onOpenCancelDialog(reservationId);
          return Promise.resolve();
        }}
      />
      <ConfirmDialog
        open={reservationToCancel !== null}
        title="Cancelar reserva"
        description="Esta accion cancelara la reserva seleccionada. Deseas continuar?"
        confirmLabel="Si, cancelar"
        isConfirming={cancelReservationMutation.isPending}
        onCancel={() => setReservationToCancel(null)}
        onConfirm={() => {
          if (!reservationToCancel) {
            return;
          }
          void onCancelReservation(reservationToCancel);
        }}
      />
    </div>
  );
}

