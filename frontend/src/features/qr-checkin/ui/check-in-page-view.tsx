import { useState } from "react";

import { Alert } from "@shared/ui/Alert";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { Input } from "@shared/ui/Input";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import { mapQrCheckInErrorToMessage } from "@features/qr-checkin/model/qr-checkin-error-messages";
import { useQrCheckInMutation } from "@features/qr-checkin/mutations/use-qr-checkin-mutation";

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CheckInPageView(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const [feedback, setFeedback] = useState<{
    message: string | null;
    error: string | null;
  }>({
    message: null,
    error: null
  });
  const [date, setDate] = useState(() => getTodayDate());
  const [qrPublicId, setQrPublicId] = useState("");
  const checkInMutation = useQrCheckInMutation(date);

  const onSubmit = async () => {
    const trimmedQrPublicId = qrPublicId.trim();
    if (!trimmedQrPublicId) {
      setFeedback({
        message: null,
        error: "Introduce el codigo QR publico."
      });
      return;
    }

    setFeedback({
      message: null,
      error: null
    });

    try {
      const result = await checkInMutation.mutateAsync({
        date,
        qrPublicId: trimmedQrPublicId
      });
      setQrPublicId("");
      if (result.status === "already_checked_in") {
        setFeedback({
          message: "Ya estabas en estado check-in para esta reserva.",
          error: null
        });
        return;
      }
      setFeedback({
        message: "Check-in confirmado.",
        error: null
      });
    } catch (error) {
      setFeedback({
        message: null,
        error: mapQrCheckInErrorToMessage(error, "No se pudo completar el check-in.")
      });
    }
  };

  if (!isAuthenticated) {
    return <Alert variant="error">Debes iniciar sesiÃ³n para realizar check-in.</Alert>;
  }

  return (
    <div className="grid gap-4">
      {feedback.error ? <Alert variant="error">{feedback.error}</Alert> : null}
      {feedback.message ? <Alert variant="success">{feedback.message}</Alert> : null}

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-[22px] font-semibold text-foreground">Check-in QR</h2>
          <p className="text-sm text-muted">
            Escanea el QR o usa el codigo publico como fallback.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <label htmlFor="checkin-date" className="text-sm font-medium text-secondary">
              Fecha
            </label>
            <Input
              id="checkin-date"
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="w-45"
            />
          </div>

          <div className="grid min-w-55 gap-2">
            <label htmlFor="qr-public-id" className="text-sm font-medium text-secondary">
              QR publico
            </label>
            <Input
              id="qr-public-id"
              type="text"
              value={qrPublicId}
              onChange={event => setQrPublicId(event.target.value)}
              placeholder="qr_public_id"
            />
          </div>

          <Button
            disabled={checkInMutation.isPending}
            onClick={() => {
              void onSubmit();
            }}
          >
            {checkInMutation.isPending ? "Procesando..." : "Confirmar check-in"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

