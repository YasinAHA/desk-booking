import { ApiError } from "../../../shared/api/api-error";

const qrCheckInMessages: Record<string, string> = {
  RESERVATION_NOT_FOUND:
    "No existe una reserva valida para ese QR y fecha.",
  RESERVATION_NOT_ACTIVE: "La reserva no esta activa para check-in."
};

export function mapQrCheckInErrorToMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (!(error instanceof ApiError)) {
    return fallbackMessage;
  }

  return qrCheckInMessages[error.code] ?? error.message ?? fallbackMessage;
}
