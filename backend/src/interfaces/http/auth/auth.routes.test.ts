import assert from "node:assert/strict";
import test from "node:test";

import argon2 from "argon2";
import Fastify from "fastify";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_EMAIL_DOMAINS = "camerfirma.com";

const { authRoutes } = await import("./auth.routes.js");
const { registerAuthPlugin } = await import("../plugins/auth.js");

type DbQuery = (text: string, params?: unknown[]) => Promise<any>;

async function buildTestApp(query: DbQuery) {
	const app = Fastify({ logger: false });
	
	// Mock pool for TransactionManager
	const mockPool: any = {
		connect: async () => ({
			query: async (text: string, params?: unknown[]) => {
				// Handle transaction commands
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
	await app.register(authRoutes, { prefix: "/auth" });
	await app.ready();
	return app;
}

test("POST /auth/register returns 403 for domain not allowed", async () => {
	const app = await buildTestApp(async () => {
		throw new Error("DB should not be called");
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/register",
		payload: {
			email: "user@other.com",
			password: "ValidPass123!",
			first_name: "User",
			last_name: "Other",
		},
	});

	assert.equal(res.statusCode, 403);
	await app.close();
});

test("POST /auth/register returns 200 when already confirmed", async () => {
	const app = await buildTestApp(async () => {
		return {
			rows: [
				{
					id: "user-1",
					email: "admin@camerfirma.com",
					password_hash: "hash:123456",
					first_name: "Admin",
					last_name: "User",
					second_last_name: null,
					confirmed_at: new Date().toISOString(),
				},
			],
		};
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/register",
		payload: {
			email: "admin@camerfirma.com",
			password: "ValidPass123!",
			first_name: "Admin",
			last_name: "User",
		},
	});

	assert.equal(res.statusCode, 200);
	await app.close();
});

test("POST /auth/login returns 401 when not confirmed", async () => {
	const hash = await argon2.hash("123456");
	const app = await buildTestApp(async () => {
		return {
			rows: [
				{
					id: "user-1",
					email: "admin@camerfirma.com",
					password_hash: hash,
					first_name: "Admin",
					last_name: "User",
					second_last_name: null,
					confirmed_at: null,
				},
			],
		};
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { email: "admin@camerfirma.com", password: "123456" },
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

test("POST /auth/login returns 401 when user not found", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { email: "admin@camerfirma.com", password: "123456" },
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

test("POST /auth/verify returns 401 for invalid token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/auth/verify",
		payload: { token: "bad-token" },
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});
