import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import Fastify from "fastify";
import { SignJWT } from "jose";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";

const { adminRoutes } = await import("./admin.routes.js");
const { registerAuthPlugin } = await import("@interfaces/http/plugins/auth.js");

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

async function buildToken(userId = "admin-1"): Promise<string> {
	return await new SignJWT({
		id: userId,
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
		jti: randomUUID(),
		type: "access",
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(new TextEncoder().encode(process.env.JWT_SECRET ?? "test-secret"));
}

async function buildTestApp(query: DbQuery, authenticatedUserId = "admin-1") {
	const app = Fastify({ logger: false });
	app.decorate("db", { query });

	const authSessionLifecycleService = {
		async verifyAccessToken() {
			return {
				id: authenticatedUserId,
				email: "admin@camerfirma.com",
				firstName: "Admin",
				lastName: "User",
				secondLastName: null,
				jti: randomUUID(),
				type: "access" as const,
				iat: Math.floor(Date.now() / 1000),
			};
		},
	} as unknown as import("@application/auth/services/auth-session-lifecycle.service.js").AuthSessionLifecycleService;

	await app.register(registerAuthPlugin, { authSessionLifecycleService });
	await app.register(adminRoutes, { prefix: "/admin" });
	await app.ready();
	return app;
}

test("GET /admin/settings returns 401 without token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));
	const res = await app.inject({ method: "GET", url: "/admin/settings" });
	assert.equal(res.statusCode, 401);
	await app.close();
});

test("GET /admin/settings returns 403 for non-admin", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "user-1") {
			return { rows: [{ role: "user" }] };
		}
		return { rows: [] };
	}, "user-1");

	const res = await app.inject({
		method: "GET",
		url: "/admin/settings",
		headers: { Authorization: `Bearer ${await buildToken("user-1")}` },
	});

	assert.equal(res.statusCode, 403);
	await app.close();
});

test("GET /admin/settings returns settings for admin", async () => {
	const app = await buildTestApp(async (text, params) => {
		if (params?.[0] === "admin-1") {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("from app_settings")) {
			return {
				rows: [{
					id: "33333333-3333-3333-8333-333333333333",
					allow_self_registration: false,
					guest_mode_enabled: true,
					checkin_window_minutes: 15,
					max_advance_days: 7,
					max_reservations_per_user: 1,
					cancellation_deadline_minutes: 120,
					default_reservation_duration_minutes: 480,
					business_hours_start: "08:00:00",
					business_hours_end: "20:00:00",
					allowed_email_domains: ["camerfirma.com"],
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/settings",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.guestModeEnabled, true);
	await app.close();
});

test("POST /admin/reservations creates guest reservation", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-1") {
			return { rows: [{ role: "admin" }] };
		}
		if (Array.isArray(params) && params.length >= 11) {
			return { rows: [{ id: "44444444-4444-4444-8444-444444444444" }], rowCount: 1 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/admin/reservations",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			reservationType: "guest",
			hostUserId: "11111111-1111-1111-8111-111111111111",
			deskId: "22222222-2222-2222-8222-222222222222",
			startsAt: "2026-04-01T09:00:00.000Z",
			endsAt: "2026-04-01T18:00:00.000Z",
			guestName: "Invitado Demo",
			guestEmail: "invitado@externo.com",
		},
	});

	assert.equal(res.statusCode, 201);
	const body = res.json();
	assert.equal(body.ok, true);
	await app.close();
});

test("PATCH /admin/reservations/:id returns 404 when reservation does not exist", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-1") {
			return { rows: [{ role: "admin" }] };
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/reservations/55555555-5555-5555-8555-555555555555",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: { status: "cancelled" },
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("GET /admin/reports/summary returns aggregate counters", async () => {
	const app = await buildTestApp(async (text, params) => {
		if (params?.[0] === "admin-1") {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("total_reservations")) {
			return {
				rows: [{
					total_reservations: 8,
					checked_in: 5,
					cancelled: 2,
					no_show: 1,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/reports/summary?start=2026-04-01&end=2026-04-30",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.totalReservations, 8);
	assert.equal(body.noShow, 1);
	await app.close();
});
