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
	app.decorate("runtimeAppSettings", {
		get: () => ({
			checkinWindowMinutes: 15,
			defaultReservationDurationMinutes: 480,
		}),
		apply: () => {},
		refresh: async () => ({
			checkinWindowMinutes: 15,
			defaultReservationDurationMinutes: 480,
		}),
	});

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
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
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

test("GET /admin/users returns paginated users for admin", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("count(*)::int as total from users")) {
			return { rows: [{ total: 1 }] };
		}
		if (text.includes("from users u")) {
			return {
				rows: [{
					id: "aaaaaaa1-1111-4111-8111-111111111111",
					email: "laura@camerfirma.com",
					first_name: "Laura",
					last_name: "Fernandez",
					second_last_name: null,
					role: "admin",
					status: "active",
					created_at: "2026-04-18T10:00:00.000Z",
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/users?q=laura&role=admin&status=active&page=1&pageSize=10",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.total, 1);
	assert.equal(body.items[0]?.email, "laura@camerfirma.com");
	await app.close();
});

test("PATCH /admin/users/:id updates role/status", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update users set")) {
			return {
				rows: [{
					id: "aaaaaaa1-1111-4111-8111-111111111111",
					email: "ana@camerfirma.com",
					first_name: "Ana",
					last_name: "Lopez",
					second_last_name: null,
					role: "admin",
					status: "suspended",
					created_at: "2026-04-18T10:00:00.000Z",
				}],
				rowCount: 1,
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/users/aaaaaaa1-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: { role: "admin", status: "suspended" },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.status, "suspended");
	assert.equal(body.role, "admin");
	await app.close();
});

test("PATCH /admin/users/:id returns 404 when user does not exist", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update users set")) {
			return { rows: [], rowCount: 0 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/users/bbbbbbb1-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: { status: "active" },
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("POST /admin/reservations creates guest reservation", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (_text.includes("select role from users where id = $1")) {
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
	const app = await buildTestApp(async (_text, _params) => {
		if (_text.includes("select role from users where id = $1")) {
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
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
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

test("GET /admin/reports/cancellations returns grouped results", async () => {
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("avg_cancellation_lead_minutes")) {
			return {
				rows: [{
					cancellation_date: "2026-04-01",
					actor_user_id: "11111111-1111-1111-8111-111111111111",
					actor_email: "maria@camerfirma.com",
					cancellations: 3,
					avg_cancellation_lead_minutes: 180,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/reports/cancellations?start=2026-04-01&end=2026-04-30",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.items[0]?.cancellations, 3);
	await app.close();
});

test("GET /admin/reports/audit-log supports actor filter", async () => {
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("from audit_events")) {
			return {
				rows: [{
					id: "88888888-8888-4888-8888-888888888888",
					event_type: "reservation_cancelled",
					actor_type: "admin",
					actor_user_id: "11111111-1111-1111-8111-111111111111",
					actor_email: "admin@camerfirma.com",
					reservation_id: "99999999-9999-4999-8999-999999999999",
					desk_id: "22222222-2222-2222-8222-222222222222",
					office_id: "33333333-3333-3333-8333-333333333333",
					reason: "Policy update",
					metadata: { source: "admin-panel" },
					created_at: "2026-04-18T10:00:00.000Z",
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/reports/audit-log?start=2026-04-01&end=2026-04-30&actorId=11111111-1111-1111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.items[0]?.eventType, "reservation_cancelled");
	await app.close();
});

test("GET /admin/reports/summary format=csv returns attachment", async () => {
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("total_reservations")) {
			return {
				rows: [{
					total_reservations: 2,
					checked_in: 1,
					cancelled: 1,
					no_show: 0,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/reports/summary?start=2026-04-01&end=2026-04-30&format=csv",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	assert.match(res.headers["content-type"] ?? "", /text\/csv/);
	assert.match(res.headers["content-disposition"] ?? "", /summary-2026-04-01-2026-04-30\.csv/);
	assert.match(res.body, /totalReservations/);
	await app.close();
});
