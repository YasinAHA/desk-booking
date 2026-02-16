import assert from "node:assert/strict";
import test from "node:test";

import Fastify from "fastify";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_EMAIL_DOMAINS = "camerfirma.com";

const { reservationsRoutes } = await import("./reservations.routes.js");
const { registerAuthPlugin } = await import("@interfaces/http/plugins/auth.js");

type DbQuery = (text: string, params?: unknown[]) => Promise<any>;

async function buildTestApp(query: DbQuery) {
	const app = Fastify({ logger: false });
	app.decorate("db", { query });
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

test("POST /reservations returns 409 on conflict", async () => {
	const app = await buildTestApp(async () => {
		const err = new Error("conflict") as Error & { code?: string };
		err.code = "23505";
		throw err;
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
	await app.close();
});

test("DELETE /reservations/:id returns 404 when not found", async () => {
	const app = await buildTestApp(async text => {
		if (text.startsWith("select id, reservation_date")) {
			return { rows: [] };
		}
		return { rowCount: 0 };
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
		return { rowCount: 0 };
	});

	const res = await app.inject({
		method: "DELETE",
		url: "/reservations/22222222-2222-2222-2222-222222222222",
		headers: { Authorization: `Bearer ${buildToken(app)}` },
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});
