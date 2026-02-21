import type { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
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

async function buildTestApp(query: DbQuery, authenticatedUserId = "user-1") {
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
	} as unknown as AuthSessionLifecycleService;
	await app.register(registerAuthPlugin, { authSessionLifecycleService });
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
	const app = await buildTestApp(async (_text, params) => {
		if (Array.isArray(params) && params.length === 2) {
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
		return { rows: [], rowCount: 0 };
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
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "user-1") {
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

test("GET /desks/admin returns 500 when admin authorization check fails", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-err") {
			throw new Error("db unavailable");
		}
		return { rows: [] };
	}, "admin-err");

	const token = await signAccessToken({
		id: "admin-err",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "Err",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "GET",
		url: "/desks/admin",
		headers: { Authorization: `Bearer ${token}` },
	});

	assert.equal(res.statusCode, 500);
	const body = res.json();
	assert.equal(typeof body.message, "string");
	await app.close();
});

test("GET /desks/admin returns desks with qrPublicId for admin", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-1") {
			return { rows: [{ role: "admin" }] };
		}
		if (!params || params.length === 0) {
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
	}, "admin-1");

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
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-1") {
			return { rows: [{ role: "admin" }] };
		}
		if (
			params?.[0] === "11111111-1111-1111-8111-111111111111" &&
			params.length === 1
		) {
			return { rows: [{ qr_public_id: "qr-new-123" }], rowCount: 1 };
		}
		return { rows: [] };
	}, "admin-1");

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
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-1") {
			return { rows: [{ role: "admin" }] };
		}
		if (!params || params.length === 0) {
			return { rows: [], rowCount: 12 };
		}
		return { rows: [] };
	}, "admin-1");

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

test("GET /desks/admin returns 403 when application handler denies admin access", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-shadow") {
			return { rows: [{ role: "user" }] };
		}
		if (!params || params.length === 0) {
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
	}, "admin-shadow");

	const token = await signAccessToken({
		id: "admin-shadow",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "Shadow",
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

test("POST /desks/admin/:id/qr/regenerate returns 403 when application handler denies admin access", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-shadow") {
			return { rows: [{ role: "user" }] };
		}
		if (
			params?.[0] === "11111111-1111-1111-8111-111111111111" &&
			params.length === 1
		) {
			return { rows: [{ qr_public_id: "qr-new-123" }], rowCount: 1 };
		}
		return { rows: [] };
	}, "admin-shadow");

	const token = await signAccessToken({
		id: "admin-shadow",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "Shadow",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "POST",
		url: "/desks/admin/11111111-1111-1111-8111-111111111111/qr/regenerate",
		headers: { Authorization: `Bearer ${token}` },
	});

	assert.equal(res.statusCode, 403);
	await app.close();
});

test("POST /desks/admin/qr/regenerate-all returns 403 when application handler denies admin access", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "admin-shadow") {
			return { rows: [{ role: "user" }] };
		}
		if (!params || params.length === 0) {
			return { rows: [], rowCount: 12 };
		}
		return { rows: [] };
	}, "admin-shadow");

	const token = await signAccessToken({
		id: "admin-shadow",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "Shadow",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "POST",
		url: "/desks/admin/qr/regenerate-all",
		headers: { Authorization: `Bearer ${token}` },
	});

	assert.equal(res.statusCode, 403);
	await app.close();
});
