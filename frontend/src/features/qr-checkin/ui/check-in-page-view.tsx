import { useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { Alert } from "@shared/ui/Alert";
import { Card } from "@shared/ui/Card";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import { mapQrCheckInErrorToMessage } from "@features/qr-checkin/model/qr-checkin-error-messages";
import { useQrCheckInMutation } from "@features/qr-checkin/mutations/use-qr-checkin-mutation";

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CheckInPageView(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const [searchParams] = useSearchParams();
  const [feedback, setFeedback] = useState<{
    message: string | null;
    error: string | null;
  }>({
    message: null,
    error: null
  });

  const date = getTodayDate();
  const qrPublicId = (searchParams.get("qrPublicId") ?? "").trim();
  const checkInMutation = useQrCheckInMutation(date);
  const processedQrPublicId = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !qrPublicId) {
      return;
    }

    if (processedQrPublicId.current === qrPublicId) {
      return;
    }

    processedQrPublicId.current = qrPublicId;
    setFeedback({ message: null, error: null });

    void (async () => {
      try {
        const result = await checkInMutation.mutateAsync({
          date,
          qrPublicId
        });

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
    })();
  }, [checkInMutation, date, isAuthenticated, qrPublicId]);

  if (!isAuthenticated) {
    return <Alert variant="error">Debes iniciar sesión para realizar check-in.</Alert>;
  }

  if (!qrPublicId) {
    return (
      <Card>
        <Alert variant="default">
          Escanea el QR del escritorio para iniciar el check-in.
        </Alert>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {checkInMutation.isPending ? (
        <Alert variant="default">Procesando check-in...</Alert>
      ) : null}
      {feedback.error ? <Alert variant="error">{feedback.error}</Alert> : null}
      {feedback.message ? <Alert variant="success">{feedback.message}</Alert> : null}

      <Card className="space-y-2">
        <h2 className="text-[22px] font-semibold text-foreground">Check-in QR</h2>
        <p className="text-sm text-muted">Fecha: {date}</p>
        <code className="break-all text-xs text-secondary">{qrPublicId}</code>
      </Card>
    </div>
  );
}
