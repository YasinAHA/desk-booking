import { useMemo, useState } from "react";

import { Alert } from "@shared/ui/Alert";
import { Badge } from "@shared/ui/Badge";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { useToast } from "@shared/ui/use-toast";

import type { AdminDeskItem } from "@features/admin-qr/api/admin-qr-api";
import {
  buildDeskQrImageUrl,
  printDeskQrs
} from "@features/admin-qr/model/admin-qr-utils";
import { useRegenerateAllDeskQrMutation } from "@features/admin-qr/mutations/use-regenerate-all-desk-qr-mutation";
import { useRegenerateDeskQrMutation } from "@features/admin-qr/mutations/use-regenerate-desk-qr-mutation";
import { useAdminDesksQuery } from "@features/admin-qr/queries/use-admin-desks-query";
import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import { mapReservationErrorToMessage } from "@features/reservations/model/reservations-error-messages";

function getDeskStatusBadgeVariant(status: "active" | "maintenance" | "disabled") {
  if (status === "active") {
    return "success" as const;
  }
  if (status === "maintenance") {
    return "warning" as const;
  }
  return "destructive" as const;
}

type AdminQrSectionProps = {
  isPending: boolean;
  isError: boolean;
  errorMessage: string;
  isRegeneratingAll: boolean;
  regeneratingDeskId: string | null;
  items: AdminDeskItem[];
  onRegenerateAll: () => Promise<void>;
  onRegenerateOne: (deskId: string, deskCode: string) => Promise<void>;
  onPrintAll: () => void;
  onPrintOne: (item: AdminDeskItem) => void;
};

function AdminQrSection({
  isPending,
  isError,
  errorMessage,
  isRegeneratingAll,
  regeneratingDeskId,
  items,
  onRegenerateAll,
  onRegenerateOne,
  onPrintAll,
  onPrintOne
}: Readonly<AdminQrSectionProps>): JSX.Element {
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-[22px] font-semibold text-foreground">Admin QR</h2>
        <p className="text-sm text-muted">
          Gestion basica de QR por escritorio (listar y regenerar).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={isRegeneratingAll}
          onClick={() => {
            void onRegenerateAll();
          }}
        >
          {isRegeneratingAll ? "Regenerando..." : "Regenerar QR de todos"}
        </Button>
        <Button
          variant="secondary"
          disabled={items.length === 0}
          onClick={onPrintAll}
        >
          Imprimir todos
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
                disabled={isRegeneratingAll || regeneratingDeskId === item.id}
                onClick={() => {
                  void onRegenerateOne(item.id, item.code);
                }}
              >
                {regeneratingDeskId === item.id ? "Regenerando..." : "Regenerar QR"}
              </Button>
              <Button
                variant="secondary"
                disabled={isRegeneratingAll}
                onClick={() => {
                  onPrintOne(item);
                }}
              >
                Imprimir QR
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function AdminDesksPageView(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const { pushToast } = useToast();
  const [regeneratingDeskId, setRegeneratingDeskId] = useState<string | null>(null);

  const adminDesksQuery = useAdminDesksQuery(isAuthenticated);
  const regenerateDeskQrMutation = useRegenerateDeskQrMutation();
  const regenerateAllDeskQrMutation = useRegenerateAllDeskQrMutation();
  const adminDesks = useMemo(
    () => adminDesksQuery.data?.items ?? [],
    [adminDesksQuery.data]
  );

  const adminDesksErrorMessage = "Error cargando desks de administracion.";

  const onRegenerateDeskQr = async (deskId: string, deskCode: string) => {
    setRegeneratingDeskId(deskId);
    try {
      await regenerateDeskQrMutation.mutateAsync(deskId);
      pushToast(`QR regenerado para ${deskCode}.`, "success");
    } catch (error) {
      pushToast(
        mapReservationErrorToMessage(error, "No se pudo regenerar el QR del desk."),
        "error"
      );
    } finally {
      setRegeneratingDeskId(null);
    }
  };

  const onRegenerateAllDeskQr = async () => {
    setRegeneratingDeskId(null);
    try {
      const result = await regenerateAllDeskQrMutation.mutateAsync();
      pushToast(`QR regenerados: ${result.updated}.`, "success");
    } catch (error) {
      pushToast(
        mapReservationErrorToMessage(error, "No se pudieron regenerar todos los QR."),
        "error"
      );
    }
  };

  const onPrintDeskQr = (item: AdminDeskItem) => {
    printDeskQrs(`QR ${item.code}`, [item]);
  };

  const onPrintAllDeskQr = () => {
    if (adminDesks.length === 0) {
      pushToast("No hay escritorios para imprimir.", "error");
      return;
    }
    printDeskQrs("QR de todos los escritorios", adminDesks);
  };

  return (
    <div className="grid gap-4">
      <AdminQrSection
        isPending={adminDesksQuery.isPending}
        isError={adminDesksQuery.isError}
        errorMessage={adminDesksErrorMessage}
        isRegeneratingAll={regenerateAllDeskQrMutation.isPending}
        regeneratingDeskId={regeneratingDeskId}
        items={adminDesks}
        onRegenerateAll={onRegenerateAllDeskQr}
        onRegenerateOne={onRegenerateDeskQr}
        onPrintAll={onPrintAllDeskQr}
        onPrintOne={onPrintDeskQr}
      />
    </div>
  );
}

