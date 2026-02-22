import { useMemo, useState } from "react";

import { ApiError } from "@shared/api/api-error";
import { Alert } from "@shared/ui/Alert";
import { Badge } from "@shared/ui/Badge";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { Input } from "@shared/ui/Input";
import { useToast } from "@shared/ui/use-toast";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import type { DesksResponse } from "@features/desks/api/desks-api";
import { useDesksQuery } from "@features/desks/queries/use-desks-query";
import type { CreateReservationRequest } from "@features/reservations/api/reservations-api";
import { mapCreateReservationErrorToMessage } from "@features/reservations/model/reservations-error-messages";
import { useCreateReservationMutation } from "@features/reservations/mutations/use-create-reservation-mutation";

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

export function DesksPageView(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const { pushToast } = useToast();
  const [date, setDate] = useState(() => getTodayDate());

  const desksQuery = useDesksQuery(date, isAuthenticated);
  const createReservationMutation = useCreateReservationMutation(date);
  const desks = useMemo(() => desksQuery.data?.items ?? [], [desksQuery.data]);

  const desksErrorMessage =
    desksQuery.error instanceof ApiError
      ? desksQuery.error.message
      : "Error cargando escritorios.";

  const onCreateReservation = async (payload: CreateReservationRequest) => {
    try {
      await createReservationMutation.mutateAsync(payload);
      pushToast("Reserva creada correctamente.", "success");
    } catch (error) {
      pushToast(
        mapCreateReservationErrorToMessage(error, "No se pudo crear la reserva."),
        "error"
      );
    }
  };

  return (
    <div className="grid gap-4">
      <DesksSection
        date={date}
        isFetching={desksQuery.isFetching}
        isPending={desksQuery.isPending}
        isError={desksQuery.isError}
        errorMessage={desksErrorMessage}
        desks={desks}
        isMutating={createReservationMutation.isPending}
        onDateChange={value => {
          setDate(value);
        }}
        onReserve={onCreateReservation}
      />
    </div>
  );
}

