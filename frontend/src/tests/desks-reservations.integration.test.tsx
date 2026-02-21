import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesksPage } from "../pages/desks-page";
import { AuthSessionContext } from "../features/auth/model/auth-session-context";

type Desk = {
  id: string;
  officeId: string;
  code: string;
  name: string | null;
  status: "active" | "maintenance" | "disabled";
  isReserved: boolean;
  isMine: boolean;
  reservationId: string | null;
  occupantName: string | null;
};

type Reservation = {
  reservationId: string;
  deskId: string;
  officeId: string;
  deskName: string;
  reservationDate: string;
  source: "user" | "admin" | "walk_in" | "system";
  cancelledAt: string | null;
};

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function renderDesksPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  render(
    <AuthSessionContext.Provider
      value={{
        user: null,
        isAuthenticated: true,
        isBootstrapping: false,
        signIn: async () => {},
        signOut: async () => {}
      }}
    >
      <QueryClientProvider client={queryClient}>
        <DesksPage />
      </QueryClientProvider>
    </AuthSessionContext.Provider>
  );
}

function setupFetchServer(options?: { conflictOnCreate?: boolean; withReservation?: boolean }) {
  const today = getTodayDate();
  const desks: Desk[] = [
    {
      id: "desk-1",
      officeId: "office-1",
      code: "D-01",
      name: "Ventana",
      status: "active",
      isReserved: options?.withReservation ?? false,
      isMine: options?.withReservation ?? false,
      reservationId: options?.withReservation ? "res-1" : null,
      occupantName: options?.withReservation ? "Yo" : null
    }
  ];

  const reservations: Reservation[] = options?.withReservation
    ? [
        {
          reservationId: "res-1",
          deskId: "desk-1",
          officeId: "office-1",
          deskName: "Ventana",
          reservationDate: today,
          source: "user",
          cancelledAt: null
        }
      ]
    : [];

  const calls: string[] = [];

  const fetchMock = vi
    .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    .mockImplementation((input, init) => {
      const method = init?.method ?? "GET";
      const requestUrl =
        input instanceof URL
          ? input.toString()
          : typeof input === "string"
            ? input
            : input.url;
      const url = new URL(requestUrl);
      calls.push(`${method} ${url.pathname}${url.search}`);

      if (method === "GET" && url.pathname === "/desks") {
        return Promise.resolve(
          new Response(JSON.stringify({ date: today, items: desks }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }

      if (method === "GET" && url.pathname === "/reservations/me") {
        return Promise.resolve(
          new Response(JSON.stringify({ items: reservations }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }

      if (method === "POST" && url.pathname === "/reservations") {
        if (options?.conflictOnCreate) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                error: {
                  code: "DESK_ALREADY_RESERVED",
                  message: "Conflict"
                }
              }),
              {
                status: 409,
                headers: { "Content-Type": "application/json" }
              }
            )
          );
        }

        const rawBody =
          typeof init?.body === "string" ? init.body : JSON.stringify(init?.body);
        const body = JSON.parse(rawBody) as {
          date: string;
          deskId: string;
          officeId?: string;
        };
        const targetDesk = desks.find(item => item.id === body.deskId);
        if (targetDesk) {
          targetDesk.isReserved = true;
          targetDesk.isMine = true;
          targetDesk.reservationId = "res-2";
          targetDesk.occupantName = "Yo";
        }
        reservations.unshift({
          reservationId: "res-2",
          deskId: body.deskId,
          officeId: body.officeId ?? "office-1",
          deskName: targetDesk?.name ?? "Desk",
          reservationDate: body.date,
          source: "user",
          cancelledAt: null
        });

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, reservationId: "res-2" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }

      if (method === "DELETE" && url.pathname.startsWith("/reservations/")) {
        const reservationId = url.pathname.split("/").at(-1);
        const reservationIndex = reservations.findIndex(
          item => item.reservationId === reservationId
        );
        if (reservationIndex >= 0) {
          const [reservation] = reservations.splice(reservationIndex, 1);
          const desk = desks.find(item => item.id === reservation.deskId);
          if (desk) {
            desk.isReserved = false;
            desk.isMine = false;
            desk.reservationId = null;
            desk.occupantName = null;
          }
        }

        return Promise.resolve(new Response(null, { status: 204 }));
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        )
      );
    });

  vi.stubGlobal("fetch", fetchMock);

  return { calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("desks reservations integration", () => {
  it("creates reservation and refreshes desks/reservations", async () => {
    const server = setupFetchServer();
    renderDesksPage();
    const user = userEvent.setup();

    await screen.findByText("D-01");
    await user.click(screen.getByRole("button", { name: "Reservar" }));

    await screen.findByText("Reserva creada correctamente.");
    await screen.findByRole("button", { name: "Reservado por ti" });

    expect(
      server.calls.filter(call => call === `GET /reservations/me`).length
    ).toBeGreaterThan(1);
    expect(server.calls.some(call => call === "POST /reservations")).toBe(true);
  });

  it("shows mapped backend business error on reservation conflict", async () => {
    setupFetchServer({ conflictOnCreate: true });
    renderDesksPage();
    const user = userEvent.setup();

    await screen.findByText("D-01");
    await user.click(screen.getByRole("button", { name: "Reservar" }));

    await screen.findByText("Ese escritorio ya esta reservado.");
  });

  it("cancels reservation from my reservations list and refreshes queries", async () => {
    const server = setupFetchServer({ withReservation: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderDesksPage();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Cancelar" });
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await screen.findByText("Reserva cancelada correctamente.");
    await waitFor(() =>
      expect(screen.getByText("No tienes reservas activas.")).toBeVisible()
    );

    expect(
      server.calls.filter(call => call === `GET /desks?date=${getTodayDate()}`).length
    ).toBeGreaterThan(1);
    expect(server.calls.some(call => call.startsWith("DELETE /reservations/"))).toBe(
      true
    );
  });
});
