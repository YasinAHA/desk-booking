import assert from "node:assert/strict";
import test from "node:test";

import Fastify from "fastify";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_EMAIL_DOMAINS = "camerfirma.com";

const { reservationsRoutes } = await import("./reservations.routes.js");
const { registerAuthPlugin } = await import("@interfaces/http/plugins/auth.js");

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

function buildToken(app: ReturnType<typeof Fastify>) {
	return app.jwt.sign({
		id: "user-1",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
	});
}

test("POST /reservations returns 401 without token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/reservations",
		payload: {
			date: "2026-02-20",
			desk_id: "33333333-3333-3333-3333-333333333333",
		},
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

test("POST /reservations returns desk-specific conflict message", async () => {
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
		headers: { Authorization: `Bearer ${buildToken(app)}` },
		payload: {
			date: "2026-02-20",
			desk_id: "11111111-1111-1111-1111-111111111111",
		},
	});

	assert.equal(res.statusCode, 409);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "DESK_ALREADY_RESERVED");
	await app.close();
});

test("POST /reservations returns user/day-specific conflict message", async () => {
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
		headers: { Authorization: `Bearer ${buildToken(app)}` },
		payload: {
			date: "2026-02-20",
			desk_id: "11111111-1111-1111-1111-111111111111",
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
		headers: { Authorization: `Bearer ${buildToken(app)}` },
		payload: {
			date: "2026-02-31",
			desk_id: "11111111-1111-1111-1111-111111111111",
		},
	});

	assert.equal(res.statusCode, 400);
	const body = res.json();
	assert.equal(body.error?.code ?? body.code, "DATE_INVALID");
	await app.close();
});

test("DELETE /reservations/:id returns 404 when not found", async () => {
	const app = await buildTestApp(async text => {
		if (text.startsWith("select id, reservation_date")) {
			return { rows: [] };
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "DELETE",
		url: "/reservations/22222222-2222-2222-2222-222222222222",
		headers: { Authorization: `Bearer ${buildToken(app)}` },
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("DELETE /reservations/:id returns 400 when date is past", async () => {
	const app = await buildTestApp(async text => {
		if (text.startsWith("select id, reservation_date")) {
			return { rows: [{ reservation_date: "2020-01-01", id: "res-1" }] };
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "DELETE",
		url: "/reservations/22222222-2222-2222-2222-222222222222",
		headers: { Authorization: `Bearer ${buildToken(app)}` },
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("POST /reservations/check-in/qr returns 401 without token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/reservations/check-in/qr",
		payload: {
			date: "2026-02-20",
			qr_public_id: "qr-public-id-001",
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
		headers: { Authorization: `Bearer ${buildToken(app)}` },
		payload: {
			date: "2026-02-20",
			qr_public_id: "qr-public-id-001",
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
		headers: { Authorization: `Bearer ${buildToken(app)}` },
		payload: {
			date: "2026-02-20",
			qr_public_id: "qr-public-id-001",
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
		headers: { Authorization: `Bearer ${buildToken(app)}` },
		payload: {
			date: "2026-02-20",
			qr_public_id: "qr-public-id-001",
		},
	});

	assert.equal(res.statusCode, 409);
	await app.close();
});

