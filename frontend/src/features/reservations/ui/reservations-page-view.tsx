import { useMemo, useState } from "react";

import { CalendarDays, Clock, MapPin, X } from "lucide-react";

import { ApiError } from "@shared/api/api-error";
import { Alert } from "@shared/ui/Alert";
import { Card } from "@shared/ui/Card";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { useToast } from "@shared/ui/use-toast";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import type { ReservationItem } from "@features/reservations/api/reservations-api";
import { mapCancelReservationErrorToMessage } from "@features/reservations/model/reservations-error-messages";
import { useCancelReservationMutation } from "@features/reservations/mutations/use-cancel-reservation-mutation";
import { useMyReservationsQuery } from "@features/reservations/queries/use-my-reservations-query";

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getUtcTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDateLabel(value: string): string {
  const today = getTodayDate();
  if (value === today) {
    return "Hoy";
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (value === tomorrowIso) {
    return "Mañana";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const formatted = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short"
  }).format(parsed);

  return formatted.replace(".", "");
}

type BookingStatus = "active" | "upcoming" | "completed" | "cancelled";
type BookingTab = "active" | "history";

type ReservationUiItem = ReservationItem & {
  status: BookingStatus;
  dateLabel: string;
  deskBadgeLabel: string;
};

type ReservationApiVariant = ReservationItem & {
  cancelled_at?: string | null;
  status?: "reserved" | "checked_in" | "cancelled" | "no_show";
};

function normalizeDateOnly(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function hasCancelledState(item: ReservationApiVariant): boolean {
  if (item.status === "cancelled") {
    return true;
  }

  const rawCancelledAt = item.cancelledAt ?? item.cancelled_at ?? null;
  if (rawCancelledAt === null) {
    return false;
  }

  if (typeof rawCancelledAt === "string") {
    const trimmed = rawCancelledAt.trim();
    return trimmed.length > 0 && trimmed.toLowerCase() !== "null";
  }

  return true;
}

function getDeskBadgeLabel(deskName: string): string {
  const compact = deskName.trim();
  if (compact.length <= 3) {
    return compact.toUpperCase();
  }

  const tokens = compact.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return `${tokens[0].charAt(0)}${tokens[1].charAt(0)}`.toUpperCase();
  }

  return compact.slice(0, 3).toUpperCase();
}

function toReservationUiItem(item: ReservationItem): ReservationUiItem {
  const reservation = item as ReservationApiVariant;
  const todayLocal = getTodayDate();
  const todayUtc = getUtcTodayDate();
  const reservationDate = normalizeDateOnly(item.reservationDate);
  const isToday = reservationDate === todayLocal || reservationDate === todayUtc;
  const isCancelled = hasCancelledState(reservation);
  const isPast = reservationDate < todayLocal && reservationDate < todayUtc;

  let status: BookingStatus;
  if (reservation.status === "cancelled" || isCancelled) {
    status = "cancelled";
  } else if (reservation.status === "checked_in" || reservation.status === "reserved") {
    status = isToday ? "active" : "upcoming";
  } else if (reservation.status === "no_show") {
    status = "completed";
  } else if (isPast) {
    status = "completed";
  } else if (isToday) {
    status = "active";
  } else {
    status = "upcoming";
  }

  return {
    ...item,
    status,
    dateLabel: getDateLabel(reservationDate),
    deskBadgeLabel: getDeskBadgeLabel(item.deskName)
  };
}

function statusLabel(status: BookingStatus): string {
  if (status === "active") return "Activa";
  if (status === "upcoming") return "Próxima";
  if (status === "completed") return "Completada";
  return "Cancelada";
}

function statusClassName(status: BookingStatus): string {
  if (status === "active") {
    return "bg-desk-available/10 text-desk-available border-desk-available/20";
  }
  if (status === "upcoming") {
    return "bg-desk-reserved/10 text-desk-reserved border-desk-reserved/20";
  }
  if (status === "completed") {
    return "border-border bg-surface-muted text-secondary";
  }
  return "border-danger-border bg-danger-soft text-destructive";
}

function getZoneLabel(deskName: string): string {
  const match = /[A-Z]/i.exec(deskName);
  if (!match) {
    return "General";
  }
  return `Zona ${match[0].toUpperCase()}`;
}

type ReservationRowProps = {
  item: ReservationUiItem;
  isMutating: boolean;
  onCancel: (reservationId: string) => void;
};

function ReservationRow({ item, isMutating, onCancel }: Readonly<ReservationRowProps>): JSX.Element {
  const canCancel = item.status === "active" || item.status === "upcoming";
  const zoneLabel = getZoneLabel(item.deskName);

  return (
    <li className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
          {item.deskBadgeLabel}
        </div>
        <div>
          <p className="font-medium text-foreground">
            {item.deskName} · {zoneLabel}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {item.reservationDate}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Piso 3
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Día completo
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${statusClassName(item.status)}`}
        >
          {statusLabel(item.status)}
        </span>

        {canCancel ? (
          <button
            type="button"
            disabled={isMutating}
            onClick={() => {
              onCancel(item.reservationId);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-danger-soft hover:text-destructive disabled:opacity-50"
            aria-label="Cancelar"
            title="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </li>
  );
}

type ReservationsTabSwitcherProps = {
  tab: BookingTab;
  activeCount: number;
  historyCount: number;
  onChange: (tab: BookingTab) => void;
};

function ReservationsTabSwitcher({
  tab,
  activeCount,
  historyCount,
  onChange
}: Readonly<ReservationsTabSwitcherProps>): JSX.Element {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-muted p-1">
      <button
        type="button"
        className={
          tab === "active"
            ? "rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-foreground shadow-soft"
            : "rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground"
        }
        onClick={() => {
          onChange("active");
        }}
      >
        Activas ({activeCount})
      </button>
      <button
        type="button"
        className={
          tab === "history"
            ? "rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-foreground shadow-soft"
            : "rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground"
        }
        onClick={() => {
          onChange("history");
        }}
      >
        Historial ({historyCount})
      </button>
    </div>
  );
}

type ReservationsTabContentProps = {
  tab: BookingTab;
  activeItems: ReservationUiItem[];
  historyItems: ReservationUiItem[];
  isMutating: boolean;
  onOpenCancelDialog: (reservationId: string) => void;
};

function ReservationsTabContent({
  tab,
  activeItems,
  historyItems,
  isMutating,
  onOpenCancelDialog
}: Readonly<ReservationsTabContentProps>): JSX.Element {
  if (tab === "active") {
    return (
      <>
        {activeItems.length === 0 ? (
          <Alert variant="default">No tienes reservas activas.</Alert>
        ) : (
          <ul className="grid list-none gap-3 p-0">
            {activeItems.map(item => (
              <ReservationRow
                key={item.reservationId}
                item={item}
                isMutating={isMutating}
                onCancel={onOpenCancelDialog}
              />
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <>
      {historyItems.length === 0 ? (
        <Alert variant="default">No hay reservas pasadas.</Alert>
      ) : (
        <ul className="grid list-none gap-3 p-0">
          {historyItems.map(item => (
            <ReservationRow
              key={item.reservationId}
              item={item}
              isMutating={isMutating}
              onCancel={() => {
                // No action in history
              }}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export function ReservationsPageView(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const { pushToast } = useToast();
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null);
  const [tab, setTab] = useState<BookingTab>("active");

  const reservationsQuery = useMyReservationsQuery(isAuthenticated);
  const cancelReservationMutation = useCancelReservationMutation(getTodayDate());

  const reservations = useMemo<ReservationUiItem[]>(
    () => (reservationsQuery.data?.items ?? []).map(toReservationUiItem),
    [reservationsQuery.data]
  );

  const activeItems = useMemo(
    () =>
      reservations
        .filter(item => item.status === "active" || item.status === "upcoming")
        .sort((a, b) => a.reservationDate.localeCompare(b.reservationDate)),
    [reservations]
  );
  const historyItems = useMemo(
    () =>
      reservations.filter(
        item => item.status === "cancelled" || item.status === "completed"
      ),
    [reservations]
  );

  const reservationsErrorMessage =
    reservationsQuery.error instanceof ApiError
      ? reservationsQuery.error.message
      : "Error cargando reservas.";
  const showDataState = !reservationsQuery.isPending && !reservationsQuery.isError;

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
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-foreground">Mis reservas</h1>
        <p className="mt-1 text-sm text-muted">Gestiona todas tus reservas de escritorio.</p>
      </header>

      {reservationsQuery.isPending ? <Alert variant="default">Cargando reservas...</Alert> : null}
      {reservationsQuery.isError ? <Alert variant="error">{reservationsErrorMessage}</Alert> : null}

      {showDataState ? (
        <>
          <ReservationsTabSwitcher
            tab={tab}
            activeCount={activeItems.length}
            historyCount={historyItems.length}
            onChange={setTab}
          />

          <Card className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="font-heading text-base font-semibold text-foreground">
              {tab === "active" ? "Reservas activas y próximas" : "Historial de reservas"}
            </h2>
            <ReservationsTabContent
              tab={tab}
              activeItems={activeItems}
              historyItems={historyItems}
              isMutating={cancelReservationMutation.isPending}
              onOpenCancelDialog={setReservationToCancel}
            />
          </Card>
        </>
      ) : null}

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
