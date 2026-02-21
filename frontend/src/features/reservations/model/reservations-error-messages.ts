import { ApiError } from "../../../shared/api/api-error";

const reservationErrorMessages: Record<string, string> = {
  DESK_ALREADY_RESERVED: "Ese escritorio ya esta reservado.",
  USER_ALREADY_HAS_RESERVATION:
    "Ya tienes una reserva para esta fecha. Cancela la actual para cambiar.",
  DATE_IN_PAST: "No se puede crear una reserva en una fecha pasada.",
  RESERVATION_NOT_CANCELLABLE: "Esta reserva ya no se puede cancelar.",
  CANCELLATION_WINDOW_CLOSED:
    "Se cerro la ventana de cancelacion para esta reserva.",
  RESERVATION_NOT_FOUND: "La reserva ya no existe o no esta disponible."
};

export function mapReservationErrorToMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (!(error instanceof ApiError)) {
    return fallbackMessage;
  }

  return reservationErrorMessages[error.code] ?? error.message ?? fallbackMessage;
}
