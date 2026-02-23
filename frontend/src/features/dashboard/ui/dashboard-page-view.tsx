import { useMemo, useState } from "react";

import {
  Armchair,
  CalendarDays,
  CalendarCheck,
  Coffee,
  Clock,
  MapPin,
  Monitor,
  TrendingUp,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Alert } from "@shared/ui/Alert";
import { Button } from "@shared/ui/Button";
import { Skeleton } from "@shared/ui/Skeleton";

import { useAuthSession } from "@features/auth/model/session/use-auth-session";
import { useDesksQuery } from "@features/desks/queries/use-desks-query";
import type { ReservationItem } from "@features/reservations/api/reservations-api";
import { useMyReservationsQuery } from "@features/reservations/queries/use-my-reservations-query";

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateLabel(value: string): string {
  const today = getTodayDate();
  if (value === today) {
    return "Hoy";
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
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

  const clean = formatted.replace(".", "");
  const [day, month] = clean.split(" ");
  if (!day || !month) {
    return clean;
  }

  const monthLabel = `${month.charAt(0).toUpperCase()}${month.slice(1)}`;
  return `${day} ${monthLabel}`;
}

type OccupancyTone = {
  cardClass: string;
  iconClass: string;
};

type MapDeskStatus = "available" | "occupied" | "reserved" | "yours";
type ReservationStatus = "active" | "upcoming";

type MapDeskPosition = {
  x: number;
  y: number;
};

type MapDeskRenderable = {
  id: string;
  officeId: string;
  code: string;
  name: string | null;
  status: string;
  isMine: boolean;
  isReserved: boolean;
  occupantName: string | null;
  zone: string | null;
  x: number;
  y: number;
};

type MapDeskSource = Omit<MapDeskRenderable, "x" | "y">;

const ZONE_SLOT_TEMPLATES: readonly ReadonlyArray<MapDeskPosition>[] = [
  [
    { x: 80, y: 100 },
    { x: 160, y: 100 },
    { x: 240, y: 100 },
    { x: 80, y: 180 },
    { x: 160, y: 180 },
    { x: 240, y: 180 }
  ],
  [
    { x: 420, y: 100 },
    { x: 500, y: 100 },
    { x: 580, y: 100 },
    { x: 420, y: 180 },
    { x: 500, y: 180 },
    { x: 580, y: 180 }
  ],
  [
    { x: 180, y: 320 },
    { x: 260, y: 320 },
    { x: 340, y: 320 },
    { x: 420, y: 320 },
    { x: 500, y: 320 },
    { x: 580, y: 320 }
  ]
];

const mapStatusStyle: Record<MapDeskStatus, string> = {
  available: "fill-accent stroke-accent/60",
  occupied: "fill-warning stroke-warning/60",
  reserved: "fill-info stroke-info/60",
  yours: "fill-violet-500 stroke-violet-500/60"
};

const mapIconStyle: Record<MapDeskStatus, string> = {
  available: "text-accent",
  occupied: "text-warning",
  reserved: "text-info",
  yours: "text-violet-600"
};

const bookingStatusStyles: Record<ReservationStatus, string> = {
  active: "bg-desk-available/10 text-desk-available border-desk-available/20",
  upcoming: "bg-desk-reserved/10 text-desk-reserved border-desk-reserved/20"
};

const bookingStatusLabels: Record<ReservationStatus, string> = {
  active: "Activa",
  upcoming: "Próxima"
};

function getOccupancyTone(occupancyPercent: number): OccupancyTone {
  if (occupancyPercent >= 70) {
    return {
      cardClass: "border-warning/20 bg-warning/10",
      iconClass: "bg-warning/15 text-warning"
    };
  }

  if (occupancyPercent >= 40) {
    return {
      cardClass: "border-info/20 bg-info/10",
      iconClass: "bg-info/15 text-info"
    };
  }

  return {
    cardClass: "border-accent/20 bg-accent/10",
    iconClass: "bg-accent/15 text-accent"
  };
}

function getMapDeskStatus(desk: {
  status: string;
  isMine: boolean;
  isReserved: boolean;
}): MapDeskStatus {
  if (desk.status !== "active") {
    return "occupied";
  }

  if (desk.isMine) {
    return "yours";
  }

  if (desk.isReserved) {
    return "reserved";
  }

  return "available";
}

function getBookingStatus(reservationDate: string): ReservationStatus {
  return reservationDate === getTodayDate() ? "active" : "upcoming";
}

function getLegendDotClass(status: MapDeskStatus): string {
  if (status === "available") {
    return "bg-accent";
  }
  if (status === "occupied") {
    return "bg-warning";
  }
  if (status === "reserved") {
    return "bg-info";
  }
  return "bg-violet-500";
}

function getLegendLabel(status: MapDeskStatus): string {
  if (status === "yours") {
    return "Tu lugar";
  }
  if (status === "available") {
    return "Disponible";
  }
  if (status === "occupied") {
    return "Ocupado";
  }
  return "Reservado";
}

function getDeskHoverLabel(desk: {
  isMine: boolean;
  isReserved: boolean;
  occupantName: string | null;
  status: string;
}): string {
  if (desk.isMine) {
    return "Tu reserva";
  }

  if (desk.occupantName) {
    return desk.occupantName;
  }

  if (desk.isReserved) {
    return "Reservado";
  }
  if (desk.status !== "active") {
    return "No disponible";
  }
  return "Disponible";
}

function getDeskFillOpacity(isSelected: boolean, isHovered: boolean): number {
  if (isSelected) {
    return 0.35;
  }
  if (isHovered) {
    return 0.25;
  }
  return 0.15;
}

function DashboardSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6 lg:col-span-2">
          <div className="mb-4 space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-[420px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      </section>
    </div>
  );
}

function toMapDesks(desks: ReadonlyArray<MapDeskSource>): MapDeskRenderable[] {
  const byZone = desks.reduce((acc, desk) => {
    const zoneName = desk.zone ?? "General";
    const zoneDesks: MapDeskSource[] = acc.get(zoneName) ?? [];
    zoneDesks.push(desk);
    acc.set(zoneName, zoneDesks);
    return acc;
  }, new Map<string, MapDeskSource[]>());

  const zoneNames = Array.from(byZone.keys()).sort((a, b) => a.localeCompare(b));
  const mapped: MapDeskRenderable[] = [];

  zoneNames.forEach((zoneName, zoneIndex) => {
    const template = ZONE_SLOT_TEMPLATES[Math.min(zoneIndex, ZONE_SLOT_TEMPLATES.length - 1)];
    const zoneDesks = [...(byZone.get(zoneName) ?? [])].sort((a, b) =>
      a.code.localeCompare(b.code)
    );

    zoneDesks.forEach((desk, deskIndex) => {
      const slot = template[deskIndex % template.length];
      const overflowRow = Math.floor(deskIndex / template.length);
      mapped.push({
        ...desk,
        x: slot.x,
        y: slot.y + overflowRow * 80
      });
    });
  });

  return mapped;
}

export function DashboardPageView(): JSX.Element {
  const { isAuthenticated, user } = useAuthSession();
  const navigate = useNavigate();
  const [hoveredDesk, setHoveredDesk] = useState<string | null>(null);
  const date = getTodayDate();
  const desksQuery = useDesksQuery(date, isAuthenticated);
  const reservationsQuery = useMyReservationsQuery(isAuthenticated);

  const desks = useMemo(() => desksQuery.data?.items ?? [], [desksQuery.data]);
  const reservations = useMemo<ReservationItem[]>(
    () => reservationsQuery.data?.items ?? [],
    [reservationsQuery.data]
  );

  const activeDesks = desks.filter(item => item.status === "active");
  const availableCount = activeDesks.filter(item => !item.isReserved).length;
  const reservedCount = activeDesks.filter(item => item.isReserved).length;
  const occupancyPercent =
    activeDesks.length > 0 ? Math.round((reservedCount / activeDesks.length) * 100) : 0;
  const occupancyTone = getOccupancyTone(occupancyPercent);
  const desksForMap = useMemo(() => toMapDesks(desks), [desks]);
  const mapZoneLabels = useMemo(() => {
    const zoneNames = Array.from(
      new Set(
        desks
          .map(desk => desk.zone)
          .filter((zone): zone is string => zone !== null)
      )
    ).sort((a, b) => a.localeCompare(b));
    return {
      a: zoneNames[0] ?? "Zona A",
      b: zoneNames[1] ?? "Zona B",
      c: zoneNames[2] ?? "Zona C"
    };
  }, [desks]);

  const upcomingReservations: ReservationItem[] = reservations
    .filter(item => item.reservationDate >= date)
    .sort((a, b) => a.reservationDate.localeCompare(b.reservationDate))
    .slice(0, 3);

  const isLoading = desksQuery.isPending || reservationsQuery.isPending;
  const hasError = desksQuery.isError || reservationsQuery.isError;

  return (
    <div className="space-y-6">
      {isLoading ? <DashboardSkeleton /> : null}
      {isLoading ? null : (
        <>
      <header>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Buenos días, {user?.firstName ?? "Usuario"} 👋
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Gestiona tus reservas de escritorio desde aquí.
        </p>
      </header>

      {hasError ? (
        <Alert variant="error">
          No se pudo cargar el dashboard. Reintenta en unos segundos.
        </Alert>
      ) : null}

      {!isLoading && !hasError ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-accent/20 bg-accent/10 p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Armchair className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  +3 hoy
                </span>
              </div>
              <div className="mt-4">
                <p className="font-heading text-2xl font-bold text-foreground">{availableCount}</p>
                <p className="mt-0.5 text-sm text-secondary">Escritorios Disponibles</p>
                <p className="mt-1 text-xs text-muted/70">de {activeDesks.length} escritorios</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-secondary">
                  <CalendarCheck className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="font-heading text-2xl font-bold text-foreground">{reservations.length}</p>
                <p className="mt-0.5 text-sm text-secondary">Tus Reservas</p>
                <p className="mt-1 text-xs text-muted/70">Esta semana</p>
              </div>
            </div>

            <div
              className={`rounded-xl border p-5 transition-all duration-200 hover:shadow-md ${occupancyTone.cardClass}`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${occupancyTone.iconClass}`}
                >
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="font-heading text-2xl font-bold text-foreground">{occupancyPercent}%</p>
                <p className="mt-0.5 text-sm text-secondary">Ocupación Actual</p>
                <p className="mt-1 text-xs text-muted/70">Oficina principal</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-secondary">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="font-heading text-2xl font-bold text-foreground">67%</p>
                <p className="mt-0.5 text-sm text-secondary">Uso Promedio</p>
                <p className="mt-1 text-xs text-muted/70">Últimos 30 días</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Mapa de Oficina
                  </h2>
                  <p className="text-sm text-muted">Selecciona un escritorio para reservar</p>
                </div>
                <div className="flex gap-4">
                  {(["available", "occupied", "reserved", "yours"] as MapDeskStatus[]).map(
                    status => (
                      <div key={status} className="flex items-center gap-1.5">
                        <div className={`h-2.5 w-2.5 rounded-full ${getLegendDotClass(status)}`} />
                        <span className="text-xs text-muted">{getLegendLabel(status)}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {desksForMap.length === 0 ? (
                <Alert variant="default">No hay escritorios disponibles para el mapa.</Alert>
              ) : (
                <svg viewBox="0 0 700 420" className="w-full" style={{ maxHeight: 420 }}>
                  <defs>
                    <pattern id="dashboard-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="hsl(220 15% 90%)"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="700" height="420" fill="url(#dashboard-grid)" rx="8" />

                  <text x="160" y="60" textAnchor="middle" fontSize="13" className="fill-muted font-medium">
                    {mapZoneLabels.a}
                  </text>
                  <text x="500" y="60" textAnchor="middle" fontSize="13" className="fill-muted font-medium">
                    {mapZoneLabels.b}
                  </text>
                  <text x="340" y="285" textAnchor="middle" fontSize="13" className="fill-muted font-medium">
                    {mapZoneLabels.c}
                  </text>

                  <rect
                    x="420"
                    y="240"
                    width="120"
                    height="70"
                    rx="8"
                    fill="hsl(220 15% 94%)"
                    stroke="hsl(220 15% 85%)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <foreignObject x="440" y="258" width="80" height="40">
                    <div className="flex flex-col items-center justify-center text-muted">
                      <Users className="h-4 w-4" />
                      <span className="mt-1 text-[10px]">Sala Reunión</span>
                    </div>
                  </foreignObject>

                  <rect
                    x="580"
                    y="240"
                    width="90"
                    height="70"
                    rx="8"
                    fill="hsl(220 15% 94%)"
                    stroke="hsl(220 15% 85%)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <foreignObject x="595" y="258" width="60" height="40">
                    <div className="flex flex-col items-center justify-center text-muted">
                      <Coffee className="h-4 w-4" />
                      <span className="mt-1 text-[10px]">Cocina</span>
                    </div>
                  </foreignObject>

                  {desksForMap.map(desk => {
                    const mapStatus = getMapDeskStatus(desk);
                    const isSelected = desk.isMine;
                    const isHovered = hoveredDesk === desk.id;
                    const hoverLabel = getDeskHoverLabel(desk);

                    return (
                      <g
                        key={desk.id}
                        className="cursor-default"
                        onMouseEnter={() => setHoveredDesk(desk.id)}
                        onMouseLeave={() => setHoveredDesk(null)}
                      >
                        <rect
                          x={desk.x - 28}
                          y={desk.y - 20}
                          width={56}
                          height={40}
                          rx={6}
                          className={`${mapStatusStyle[mapStatus]} transition-all duration-200`}
                          fillOpacity={getDeskFillOpacity(isSelected, isHovered)}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        <foreignObject x={desk.x - 8} y={desk.y - 12} width={16} height={16}>
                          <Monitor className={`h-4 w-4 ${mapIconStyle[mapStatus]}`} />
                        </foreignObject>
                        <text
                          x={desk.x}
                          y={desk.y + 12}
                          textAnchor="middle"
                          fontSize="9"
                          className="fill-muted"
                          fontWeight="500"
                        >
                          {desk.code}
                        </text>
                        {isHovered ? (
                          <g>
                            <rect
                              x={desk.x - 38}
                              y={desk.y - 46}
                              width={76}
                              height={22}
                              rx={4}
                              fill="hsl(220 30% 12%)"
                              fillOpacity="0.9"
                            />
                            <text
                              x={desk.x}
                              y={desk.y - 31}
                              textAnchor="middle"
                              fontSize="10"
                              fill="white"
                            >
                              {hoverLabel}
                            </text>
                          </g>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            <div className="h-fit self-start rounded-xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">Mis Reservas</h3>
                  <p className="text-sm text-muted">Tus próximas reservas de escritorio</p>
                </div>
                <Button
                  variant="secondary"
                  className="h-9 whitespace-nowrap rounded-lg border-info/30 bg-info/10 px-3 text-sm leading-none font-semibold text-info hover:bg-info/15"
                  onClick={() => {
                    void navigate("/desks");
                  }}
                >
                  Ir a reservar
                </Button>
              </div>
              {upcomingReservations.length === 0 ? (
                <Alert variant="default">No tienes reservas activas.</Alert>
              ) : (
                <div className="space-y-3">
                  {upcomingReservations.map(item => {
                    const status = getBookingStatus(item.reservationDate);
                    return (
                      <div
                        key={item.reservationId}
                        className="flex items-center gap-4 rounded-lg border border-border p-3.5 transition-colors hover:bg-surface-muted/70"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                          <MapPin className="h-4 w-4 text-muted" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{item.deskName}</p>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {getDateLabel(item.reservationDate)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Día completo
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${bookingStatusStyles[status]}`}
                        >
                          {bookingStatusLabels[status]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
        </>
      )}
    </div>
  );
}
