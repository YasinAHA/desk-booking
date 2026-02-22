import { memo, useEffect, useMemo, useState } from "react";

import { CalendarDays, ChevronDown, Coffee, Monitor, Users } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

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
type MapDeskStatus = "available" | "occupied" | "reserved" | "yours";

type MapDeskSource = {
  id: string;
  officeId: string;
  code: string;
  name: string | null;
  status: DeskItem["status"];
  isMine: boolean;
  isReserved: boolean;
  occupantName: string | null;
  zone: string | null;
};

type MapDeskRenderable = MapDeskSource & { x: number; y: number };
type MapDeskPosition = { x: number; y: number };

type ZoneLabels = {
  a: string;
  b: string;
  c: string;
};

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

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatIsoDate(value: string): string {
  const parsed = parseIsoDate(value);
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMapDeskStatus(desk: {
  status: DeskItem["status"];
  isMine: boolean;
  isReserved: boolean;
}): MapDeskStatus {
  if (desk.status !== "active") return "occupied";
  if (desk.isMine) return "yours";
  if (desk.isReserved) return "reserved";
  return "available";
}

function getLegendDotClass(status: MapDeskStatus): string {
  if (status === "available") return "bg-accent";
  if (status === "occupied") return "bg-warning";
  if (status === "reserved") return "bg-info";
  return "bg-violet-500";
}

function getLegendLabel(status: MapDeskStatus): string {
  if (status === "available") return "Available";
  if (status === "occupied") return "Occupied";
  if (status === "reserved") return "Reserved";
  return "Your desk";
}

function getDeskHoverLabel(desk: {
  isMine: boolean;
  isReserved: boolean;
  occupantName: string | null;
  status: DeskItem["status"];
}): string {
  if (desk.isMine) return "Your reservation";
  if (desk.occupantName) return desk.occupantName;
  if (desk.isReserved) return "Reserved";
  if (desk.status !== "active") return "Unavailable";
  return "Available";
}

function getDeskFillOpacity(isHovered: boolean): number {
  return isHovered ? 0.28 : 0.16;
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
    const zoneDesks = [...(byZone.get(zoneName) ?? [])].sort((a, b) => a.code.localeCompare(b.code));

    zoneDesks.forEach((desk, deskIndex) => {
      const slot = template[deskIndex % template.length];
      const overflowRow = Math.floor(deskIndex / template.length);
      mapped.push({ ...desk, x: slot.x, y: slot.y + overflowRow * 80 });
    });
  });

  return mapped;
}

type FloorMapCanvasProps = {
  date: string;
  desks: ReadonlyArray<MapDeskRenderable>;
  hoveredDeskId: string | null;
  setHoveredDeskId: (id: string | null) => void;
  zoneLabels: ZoneLabels;
  isMutating: boolean;
  onReserve: (payload: CreateReservationRequest) => Promise<void>;
};

const FloorMapCanvas = memo(function FloorMapCanvas({
  date,
  desks,
  hoveredDeskId,
  setHoveredDeskId,
  zoneLabels,
  isMutating,
  onReserve
}: Readonly<FloorMapCanvasProps>): JSX.Element {
  return (
    <svg viewBox="0 0 700 420" className="w-full" style={{ maxHeight: 420 }}>
      <defs>
        <pattern id="desks-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(220 15% 90%)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="700" height="420" fill="url(#desks-grid)" rx="8" />

      <text x="160" y="60" textAnchor="middle" fontSize="13" className="fill-muted font-medium">
        {zoneLabels.a}
      </text>
      <text x="500" y="60" textAnchor="middle" fontSize="13" className="fill-muted font-medium">
        {zoneLabels.b}
      </text>
      <text x="340" y="285" textAnchor="middle" fontSize="13" className="fill-muted font-medium">
        {zoneLabels.c}
      </text>

      <rect
        x="420"
        y="240"
        width="120"
        height="70"
        rx={8}
        fill="hsl(220 15% 94%)"
        stroke="hsl(220 15% 85%)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <foreignObject x="440" y="258" width="80" height="40">
        <div className="flex flex-col items-center justify-center text-muted">
          <Users className="h-4 w-4" />
          <span className="mt-1 text-[10px]">Meeting room</span>
        </div>
      </foreignObject>

      <rect
        x="580"
        y="240"
        width="90"
        height="70"
        rx={8}
        fill="hsl(220 15% 94%)"
        stroke="hsl(220 15% 85%)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <foreignObject x="595" y="258" width="60" height="40">
        <div className="flex flex-col items-center justify-center text-muted">
          <Coffee className="h-4 w-4" />
          <span className="mt-1 text-[10px]">Kitchen</span>
        </div>
      </foreignObject>

      {desks.map(desk => {
        const mapStatus = getMapDeskStatus(desk);
        const isHovered = hoveredDeskId === desk.id;
        const hoverLabel = getDeskHoverLabel(desk);
        const canReserve = desk.status === "active" && !desk.isReserved && !isMutating;

        return (
          <g
            key={desk.id}
            className={canReserve ? "cursor-pointer" : "cursor-default"}
            onMouseEnter={() => {
              setHoveredDeskId(desk.id);
            }}
            onMouseLeave={() => {
              setHoveredDeskId(null);
            }}
            onClick={() => {
              if (!canReserve) return;
              void onReserve({ date, deskId: desk.id, officeId: desk.officeId, source: "user" });
            }}
          >
            <rect
              x={desk.x - 28}
              y={desk.y - 20}
              width={56}
              height={40}
              rx={6}
              className={`${mapStatusStyle[mapStatus]} transition-all duration-200`}
              fillOpacity={getDeskFillOpacity(isHovered)}
              strokeWidth={desk.isMine ? 2 : 1}
            />
            <foreignObject x={desk.x - 8} y={desk.y - 12} width={16} height={16}>
              <Monitor className={`h-4 w-4 ${mapIconStyle[mapStatus]}`} />
            </foreignObject>
            <text x={desk.x} y={desk.y + 12} textAnchor="middle" fontSize="9" className="fill-muted" fontWeight="500">
              {desk.code}
            </text>
            {isHovered ? (
              <g>
                <rect x={desk.x - 42} y={desk.y - 46} width={84} height={22} rx={4} fill="hsl(220 30% 12%)" fillOpacity="0.92" />
                <text x={desk.x} y={desk.y - 31} textAnchor="middle" fontSize="10" fill="white">
                  {hoverLabel}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
});

export function DesksPageView(): JSX.Element {
  const { isAuthenticated } = useAuthSession();
  const { pushToast } = useToast();
  const [date, setDate] = useState(() => getTodayDate());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDesktopDatePicker, setIsDesktopDatePicker] = useState(false);
  const [hoveredDeskId, setHoveredDeskId] = useState<string | null>(null);

  useEffect(() => {
    const query = globalThis.matchMedia("(min-width: 1024px)");
    const update = () => {
      setIsDesktopDatePicker(query.matches);
    };

    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  const desksQuery = useDesksQuery(date, isAuthenticated);
  const createReservationMutation = useCreateReservationMutation(date);
  const desks = useMemo(() => desksQuery.data?.items ?? [], [desksQuery.data]);

  const mapDesks = useMemo<MapDeskRenderable[]>(() => {
    const mappedInput = desks.map(desk => ({
      id: desk.id,
      officeId: desk.officeId,
      code: desk.code,
      name: desk.name,
      status: desk.status,
      isMine: desk.isMine,
      isReserved: desk.isReserved,
      occupantName: desk.occupantName,
      zone: desk.zone
    }));
    return toMapDesks(mappedInput);
  }, [desks]);

  const zoneLabels = useMemo<ZoneLabels>(() => {
    const zoneNames = Array.from(
      new Set(
        desks
          .map(desk => desk.zone)
          .filter((zone): zone is string => zone !== null)
      )
    ).sort((a, b) => a.localeCompare(b));

    return {
      a: zoneNames[0] ?? "Zone A",
      b: zoneNames[1] ?? "Zone B",
      c: zoneNames[2] ?? "Zone C"
    };
  }, [desks]);

  const selectedDateObject = useMemo(() => parseIsoDate(date), [date]);

  const desksErrorMessage =
    desksQuery.error instanceof ApiError ? desksQuery.error.message : "Could not load desks.";

  const onCreateReservation = async (payload: CreateReservationRequest): Promise<void> => {
    try {
      await createReservationMutation.mutateAsync(payload);
      pushToast(`Reservation created for ${payload.date}.`, "success");
    } catch (error) {
      pushToast(
        mapCreateReservationErrorToMessage(error, "Reservation could not be created."),
        "error"
      );
    }
  };

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Floor Map</h2>
          <p className="text-sm text-muted">Select a date and book an available desk.</p>
        </div>

        {isDesktopDatePicker ? (
          <div className="relative">
            <Button
              variant="secondary"
              className="h-10 min-w-52 justify-between"
              onClick={() => {
                setIsDatePickerOpen(current => !current);
              }}
            >
              <span className="inline-flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4" />
                {formatIsoDate(date)}
              </span>
              <ChevronDown
                className={`ml-2 h-4 w-4 shrink-0 transition-transform ${isDatePickerOpen ? "rotate-180" : ""}`}
              />
            </Button>

            {isDatePickerOpen ? (
              <div className="absolute right-0 top-12 z-20 rounded-xl border border-border bg-surface p-3 shadow-card">
                <DayPicker
                  mode="single"
                  selected={selectedDateObject}
                  onSelect={selected => {
                    if (!selected) return;
                    setDate(toIsoDate(selected));
                    setIsDatePickerOpen(false);
                  }}
                  showOutsideDays
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-1.5">
            <label htmlFor="desk-date" className="text-sm font-medium text-secondary">
              Date
            </label>
            <Input
              id="desk-date"
              type="date"
              value={date}
              onChange={event => {
                setDate(event.target.value);
              }}
              className="h-10 w-48"
            />
          </div>
        )}
      </div>

      {desksQuery.isFetching ? <Badge variant="info">Refreshing...</Badge> : null}
      {desksQuery.isPending ? <Alert variant="default">Loading floor map...</Alert> : null}
      {desksQuery.isError ? <Alert variant="error">{desksErrorMessage}</Alert> : null}

      {!desksQuery.isPending && !desksQuery.isError && mapDesks.length === 0 ? (
        <Alert variant="default">No desks available for selected date.</Alert>
      ) : null}

      {!desksQuery.isPending && !desksQuery.isError && mapDesks.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-4">
            {(["available", "occupied", "reserved", "yours"] as MapDeskStatus[]).map(status => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${getLegendDotClass(status)}`} />
                <span className="text-xs text-muted">{getLegendLabel(status)}</span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <FloorMapCanvas
              date={date}
              desks={mapDesks}
              hoveredDeskId={hoveredDeskId}
              setHoveredDeskId={setHoveredDeskId}
              zoneLabels={zoneLabels}
              isMutating={createReservationMutation.isPending}
              onReserve={onCreateReservation}
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}





