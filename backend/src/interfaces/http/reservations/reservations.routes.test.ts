import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import Fastify from "fastify";
import { SignJWT } from "jose";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_EMAIL_DOMAINS = "camerfirma.com";

const { reservationsRoutes } = await import("./reservations.routes.js");
const { registerAuthPlugin } = await import("@interfaces/http/plugins/auth.js");

function buildFutureDate(daysAhead = 7): string {
	const d = new Date();
	d.setDate(d.getDate() + daysAhead);
	while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
		d.setDate(d.getDate() + 1);
	}
	return d.toISOString().slice(0, 10);
}

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type TransactionClient = {
	query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
	release: () => void;
};

type MockPool = {
	query: DbQuery;
	connect: () => Promise<TransactionClient>;
};

async function buildTestApp(query: DbQuery) {
	const app = Fastify({ logger: false });
	const mockPool: MockPool = {
		query: async (text: string, params?: unknown[]) => query(text, params),
		connect: async () => ({
			query: async (text: string, params?: unknown[]) => {
				if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
					return { rows: [], rowCount: 0 };
				}
				return query(text, params);
			},
			release: () => {},
		}),
	};
	app.decorate("db", { query, pool: mockPool });
	await app.register(registerAuthPlugin);
	await app.register(reservationsRoutes, { prefix: "/reservations" });
	await app.ready();
	return app;
}

async function buildToken(): Promise<string> {
	return await new SignJWT({
		id: "user-1",
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

test("POST /reservations returns 401 without token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/reservations",
		payload: {
			date: "2026-02-20",
			deskId: "33333333-3333-3333-8333-333333333333",
		},
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

test("POST /reservations returns desk-specific conflict message", async () => {
	const futureDate = buildFutureDate();
	const app = await buildTestApp(async text => {
		if (text.includes("where desk_id = $1 and reservation_date = $2")) {
			return { rows: [{ 1: 1 }] };
		}
		if (text.includes("where user_id = $1 and reservation_date = $2")) {
			return { rows: [] };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/reservations",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			date: futureDate,
			deskId: "11111111-1111-1111-8111-111111111111",
		},
	});

	assert.equal(res.statusCode, 409);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "DESK_ALREADY_RESERVED");
	await app.close();
});

test("POST /reservations returns user/day-specific conflict message", async () => {
	const futureDate = buildFutureDate();
	const app = await buildTestApp(async text => {
		if (text.includes("where desk_id = $1 and reservation_date = $2")) {
			return { rows: [] };
		}
		if (text.includes("where user_id = $1 and reservation_date = $2")) {
			return { rows: [{ 1: 1 }] };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/reservations",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			date: futureDate,
			deskId: "11111111-1111-1111-8111-111111111111",
		},
	});

	assert.equal(res.statusCode, 409);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "USER_ALREADY_HAS_RESERVATION");
	await app.close();
});

test("POST /reservations returns DATE_INVALID for invalid calendar date", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/reservations",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			date: "2026-02-31",
			deskId: "11111111-1111-1111-8111-111111111111",
		},
	});

	assert.equal(res.statusCode, 400);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "DATE_INVALID");
	await app.close();
});

test("DELETE /reservations/:id returns 404 when not found", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("as is_same_day_booking_closed")) {
			return { rows: [] };
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "DELETE",
		url: "/reservations/22222222-2222-2222-8222-222222222222",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("DELETE /reservations/:id returns 400 when date is past", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("as is_same_day_booking_closed")) {
			return {
				rows: [
					{
						reservation_date: "2020-01-01",
						id: "res-1",
						status: "reserved",
						is_same_day_booking_closed: false,
					},
				],
			};
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "DELETE",
		url: "/reservations/22222222-2222-2222-8222-222222222222",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("DELETE /reservations/:id returns 409 for checked-in reservation", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("as is_same_day_booking_closed")) {
			return {
				rows: [
					{
						reservation_date: "2099-01-01",
						id: "res-1",
						status: "checked_in",
						is_same_day_booking_closed: false,
					},
				],
			};
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "DELETE",
		url: "/reservations/22222222-2222-2222-8222-222222222222",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 409);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "RESERVATION_NOT_CANCELLABLE");
	await app.close();
});

test("DELETE /reservations/:id returns 409 when cancellation window is closed", async () => {
	const today = new Date().toISOString().slice(0, 10);
	const app = await buildTestApp(async text => {
		if (text.includes("as is_same_day_booking_closed")) {
			return {
				rows: [
					{
						reservation_date: today,
						id: "res-1",
						status: "reserved",
						is_same_day_booking_closed: true,
					},
				],
			};
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "DELETE",
		url: "/reservations/22222222-2222-2222-8222-222222222222",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 409);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "CANCELLATION_WINDOW_CLOSED");
	await app.close();
});

test("POST /reservations returns NON_WORKING_DAY on weekend date", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/reservations",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			date: "2099-02-21",
			deskId: "11111111-1111-1111-8111-111111111111",
		},
	});

	assert.equal(res.statusCode, 400);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "NON_WORKING_DAY");
	await app.close();
});

test("POST /reservations returns SAME_DAY_BOOKING_CLOSED", async () => {
	const today = new Date().toISOString().slice(0, 10);
	const day = new Date(`${today}T00:00:00.000Z`).getUTCDay();
	const nonWeekendDate =
		day === 0 || day === 6 ? buildFutureDate(2) : today;
	const app = await buildTestApp(async text => {
		if (text.includes("as is_same_day_booking_closed")) {
			return { rows: [{ is_same_day_booking_closed: true }] };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/reservations",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			date: nonWeekendDate,
			deskId: "11111111-1111-1111-8111-111111111111",
		},
	});

	assert.equal(res.statusCode, 409);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "SAME_DAY_BOOKING_CLOSED");
	await app.close();
});

test("POST /reservations/check-in/qr returns 401 without token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/reservations/check-in/qr",
		payload: {
			date: "2026-02-20",
			qrPublicId: "qr-public-id-001",
		},
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

test("POST /reservations/check-in/qr returns 200 when check-in succeeds", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("with target as")) {
			return { rows: [{ result: "checked_in" }] };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/reservations/check-in/qr",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			date: "2026-02-20",
			qrPublicId: "qr-public-id-001",
		},
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.ok, true);
	assert.equal(body.status, "checked_in");
	await app.close();
});

test("POST /reservations/check-in/qr returns 404 when reservation is not found", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("with target as")) {
			return { rows: [{ result: "not_found" }] };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/reservations/check-in/qr",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			date: "2026-02-20",
			qrPublicId: "qr-public-id-001",
		},
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("POST /reservations/check-in/qr returns 409 when reservation is not active", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("with target as")) {
			return { rows: [{ result: "not_active" }] };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/reservations/check-in/qr",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			date: "2026-02-20",
			qrPublicId: "qr-public-id-001",
		},
	});

	assert.equal(res.statusCode, 409);
	await app.close();
});




