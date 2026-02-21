import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import Fastify from "fastify";
import { SignJWT } from "jose";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_EMAIL_DOMAINS = "camerfirma.com";

const { desksRoutes } = await import("./desks.routes.js");
const { registerAuthPlugin } = await import("@interfaces/http/plugins/auth.js");

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

async function signAccessToken(payload: {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	secondLastName: string | null;
}): Promise<string> {
	return await new SignJWT({
		...payload,
		jti: randomUUID(),
		type: "access",
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(new TextEncoder().encode(process.env.JWT_SECRET ?? "test-secret"));
}

async function buildTestApp(query: DbQuery) {
	const app = Fastify({ logger: false });
	app.decorate("db", { query });
	await app.register(registerAuthPlugin);
	await app.register(desksRoutes, { prefix: "/desks" });
	await app.ready();
	return app;
}

test("GET /desks returns 401 without token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "GET",
		url: "/desks?date=2026-02-20",
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

test("GET /desks returns desks for valid token", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("set status = 'no_show'")) {
			return { rows: [], rowCount: 0 };
		}
		if (text.includes("from desks")) {
			return {
				rows: [
					{
						id: "11111111-1111-1111-8111-111111111111",
						office_id: "22222222-2222-2222-8222-222222222222",
						code: "D01",
						name: "Puesto 01",
						status: "active",
						is_reserved: false,
						is_mine: false,
						reservation_id: null,
						occupant_name: null,
					},
				],
			};
		}
		return { rows: [] };
	});

	const token = await signAccessToken({
		id: "user-1",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "GET",
		url: "/desks?date=2026-02-20",
		headers: { Authorization: `Bearer ${token}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.items.length, 1);
	await app.close();
});

test("GET /desks/admin returns 403 for non-admin user", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("select role from users")) {
			return { rows: [{ role: "user" }] };
		}
		return { rows: [] };
	});

	const token = await signAccessToken({
		id: "user-1",
		email: "user@camerfirma.com",
		firstName: "User",
		lastName: "One",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "GET",
		url: "/desks/admin",
		headers: { Authorization: `Bearer ${token}` },
	});

	assert.equal(res.statusCode, 403);
	await app.close();
});

test("GET /desks/admin returns desks with qrPublicId for admin", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("select role from users")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("select d.id, d.office_id, d.code, d.name, d.status, d.qr_public_id")) {
			return {
				rows: [
					{
						id: "11111111-1111-1111-8111-111111111111",
						office_id: "22222222-2222-2222-8222-222222222222",
						code: "D01",
						name: "Puesto 01",
						status: "active",
						qr_public_id: "qr-111",
					},
				],
			};
		}
		return { rows: [] };
	});

	const token = await signAccessToken({
		id: "admin-1",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "GET",
		url: "/desks/admin",
		headers: { Authorization: `Bearer ${token}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.items.length, 1);
	assert.equal(body.items[0].qrPublicId, "qr-111");
	await app.close();
});

test("POST /desks/admin/:id/qr/regenerate rotates qr for admin", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("select role from users")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update desks set qr_public_id")) {
			return { rows: [{ qr_public_id: "qr-new-123" }], rowCount: 1 };
		}
		return { rows: [] };
	});

	const token = await signAccessToken({
		id: "admin-1",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "POST",
		url: "/desks/admin/11111111-1111-1111-8111-111111111111/qr/regenerate",
		headers: { Authorization: `Bearer ${token}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.ok, true);
	assert.equal(body.qrPublicId, "qr-new-123");
	await app.close();
});

test("POST /desks/admin/qr/regenerate-all rotates all qr ids for admin", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("select role from users")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update desks set qr_public_id = gen_random_uuid()::text")) {
			return { rows: [], rowCount: 12 };
		}
		return { rows: [] };
	});

	const token = await signAccessToken({
		id: "admin-1",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "POST",
		url: "/desks/admin/qr/regenerate-all",
		headers: { Authorization: `Bearer ${token}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.ok, true);
	assert.equal(body.updated, 12);
	await app.close();
});
