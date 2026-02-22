import { useEffect, useRef } from "react";

import { useSearchParams } from "react-router-dom";

import { Alert } from "@shared/ui/Alert";
import { Card } from "@shared/ui/Card";
import { useToast } from "@shared/ui/use-toast";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import { mapQrCheckInErrorToMessage } from "@features/qr-checkin/model/qr-checkin-error-messages";
import { useQrCheckInMutation } from "@features/qr-checkin/mutations/use-qr-checkin-mutation";

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CheckInPageView(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();

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

    void (async () => {
      try {
        const result = await checkInMutation.mutateAsync({
          date,
          qrPublicId
        });

        if (result.status === "already_checked_in") {
          const message = "Ya estabas en estado check-in para esta reserva.";
          pushToast(message, "info");
          return;
        }

        const message = "Check-in confirmado.";
        pushToast(message, "success");
      } catch (error) {
        const errorMessage = mapQrCheckInErrorToMessage(
          error,
          "No se pudo completar el check-in."
        );
        pushToast(errorMessage, "error");
      }
    })();
  }, [checkInMutation, date, isAuthenticated, pushToast, qrPublicId]);

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
      {checkInMutation.isPending ? <Alert variant="default">Procesando check-in...</Alert> : null}

      <Card className="space-y-2">
        <h2 className="text-[22px] font-semibold text-foreground">Check-in QR</h2>
        <p className="text-sm text-muted">Fecha: {date}</p>
        <code className="break-all text-xs text-secondary">{qrPublicId}</code>
      </Card>
    </div>
  );
}

