import assert from "node:assert/strict";
import test from "node:test";

import argon2 from "argon2";
import Fastify from "fastify";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ALLOWED_EMAIL_DOMAINS = "camerfirma.com";

const { authRoutes } = await import("./auth.routes.js");
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

function getFirstStringParam(params?: unknown[]): string {
	const value = params?.[0];
	return typeof value === "string" ? value : "";
}

function getJsonRecord(response: { json(): unknown }): Record<string, unknown> {
	const body = response.json();
	assert.equal(typeof body, "object");
	assert.notEqual(body, null);
	return body as Record<string, unknown>;
}

function getRequiredString(body: Record<string, unknown>, key: string): string {
	const value = body[key];
	if (typeof value !== "string") {
		throw new TypeError(`Expected string field: ${key}`);
	}
	return value;
}

async function buildTestApp(query: DbQuery) {
	const app = Fastify({ logger: false });

	// Mock pool for TransactionManager
	const mockPool: MockPool = {
		query: async (text: string, params?: unknown[]) => query(text, params),
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

test("POST /auth/refresh rotates refresh token", async () => {
	const hash = await argon2.hash("123456");
	const revokedJtis = new Set<string>();
	const app = await buildTestApp(async (text, params) => {
		if (text.includes("from users where email = $1")) {
			return {
				rows: [
					{
						id: "user-1",
						email: "admin@camerfirma.com",
						password_hash: hash,
						first_name: "Admin",
						last_name: "User",
						second_last_name: null,
						confirmed_at: new Date().toISOString(),
					},
				],
			};
		}

		if (text.includes("SELECT 1 FROM token_revocation WHERE jti = $1")) {
			const jti = getFirstStringParam(params);
			const isRevoked = revokedJtis.has(jti);
			return {
				rows: isRevoked ? [{ exists: 1 }] : [],
				rowCount: isRevoked ? 1 : 0,
			};
		}

		if (text.includes("INSERT INTO token_revocation")) {
			revokedJtis.add(getFirstStringParam(params));
			return { rows: [], rowCount: 1 };
		}

		return { rows: [], rowCount: 0 };
	});

	const loginRes = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { email: "admin@camerfirma.com", password: "123456" },
	});
	assert.equal(loginRes.statusCode, 200);
	const loginBody = getJsonRecord(loginRes);
	const initialRefreshToken = getRequiredString(loginBody, "refreshToken");

	const refreshRes = await app.inject({
		method: "POST",
		url: "/auth/refresh",
		payload: { token: initialRefreshToken },
	});
	assert.equal(refreshRes.statusCode, 200);
	const refreshBody = getJsonRecord(refreshRes);
	const accessToken = getRequiredString(refreshBody, "accessToken");
	const rotatedRefreshToken = getRequiredString(refreshBody, "refreshToken");
	assert.ok(accessToken.length > 0);
	assert.ok(rotatedRefreshToken.length > 0);
	assert.notEqual(rotatedRefreshToken, initialRefreshToken);

	await app.close();
});

test("POST /auth/refresh rejects reused revoked refresh token", async () => {
	const hash = await argon2.hash("123456");
	const revokedJtis = new Set<string>();
	const app = await buildTestApp(async (text, params) => {
		if (text.includes("from users where email = $1")) {
			return {
				rows: [
					{
						id: "user-1",
						email: "admin@camerfirma.com",
						password_hash: hash,
						first_name: "Admin",
						last_name: "User",
						second_last_name: null,
						confirmed_at: new Date().toISOString(),
					},
				],
			};
		}

		if (text.includes("SELECT 1 FROM token_revocation WHERE jti = $1")) {
			const jti = getFirstStringParam(params);
			const isRevoked = revokedJtis.has(jti);
			return {
				rows: isRevoked ? [{ exists: 1 }] : [],
				rowCount: isRevoked ? 1 : 0,
			};
		}

		if (text.includes("INSERT INTO token_revocation")) {
			revokedJtis.add(getFirstStringParam(params));
			return { rows: [], rowCount: 1 };
		}

		return { rows: [], rowCount: 0 };
	});

	const loginRes = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { email: "admin@camerfirma.com", password: "123456" },
	});
	assert.equal(loginRes.statusCode, 200);
	const loginBody = getJsonRecord(loginRes);
	const initialRefreshToken = getRequiredString(loginBody, "refreshToken");

	const firstRefreshRes = await app.inject({
		method: "POST",
		url: "/auth/refresh",
		payload: { token: initialRefreshToken },
	});
	assert.equal(firstRefreshRes.statusCode, 200);

	const secondRefreshRes = await app.inject({
		method: "POST",
		url: "/auth/refresh",
		payload: { token: initialRefreshToken },
	});
	assert.equal(secondRefreshRes.statusCode, 401);

	await app.close();
});

test("POST /auth/forgot-password returns generic OK and enqueues reset for existing user", async () => {
	const hash = await argon2.hash("123456");
	let resetCreated = false;
	let emailQueued = false;
	const app = await buildTestApp(async text => {
		if (text.includes("from users where email = $1")) {
			return {
				rows: [
					{
						id: "user-1",
						email: "admin@camerfirma.com",
						password_hash: hash,
						first_name: "Admin",
						last_name: "User",
						second_last_name: null,
						confirmed_at: new Date().toISOString(),
					},
				],
			};
		}

		if (text.includes("insert into password_resets")) {
			resetCreated = true;
			return { rows: [], rowCount: 1 };
		}

		if (text.includes("INSERT INTO email_outbox")) {
			emailQueued = true;
			return { rows: [], rowCount: 1 };
		}

		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/forgot-password",
		payload: { email: "admin@camerfirma.com" },
	});

	assert.equal(res.statusCode, 200);
	assert.equal(resetCreated, true);
	assert.equal(emailQueued, true);
	await app.close();
});

test("POST /auth/forgot-password returns generic OK for unknown user", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/auth/forgot-password",
		payload: { email: "unknown@camerfirma.com" },
	});

	assert.equal(res.statusCode, 200);
	await app.close();
});

test("POST /auth/reset-password returns 200 for valid token", async () => {
	let passwordUpdated = false;
	const app = await buildTestApp(async text => {
		if (text.includes("from password_resets")) {
			return {
				rows: [
					{
						id: "reset-1",
						user_id: "user-1",
						expires_at: "2099-01-01T00:00:00.000Z",
						consumed_at: null,
					},
				],
			};
		}
		if (text.includes("update password_resets set consumed_at = now()")) {
			return { rows: [{ user_id: "user-1" }], rowCount: 1 };
		}
		if (text.includes("update users set password_hash = $1")) {
			passwordUpdated = true;
			return { rows: [], rowCount: 1 };
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/reset-password",
		payload: {
			token: "raw-token",
			password: "ValidPass123!",
		},
	});

	assert.equal(res.statusCode, 200);
	assert.equal(passwordUpdated, true);
	await app.close();
});

test("POST /auth/reset-password returns INVALID_TOKEN when token does not exist", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("from password_resets")) {
			return { rows: [] };
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/reset-password",
		payload: {
			token: "missing-token",
			password: "ValidPass123!",
		},
	});

	assert.equal(res.statusCode, 400);
	const body = getJsonRecord(res);
	assert.equal(getRequiredString(body, "code"), "INVALID_TOKEN");
	await app.close();
});

test("POST /auth/reset-password returns EXPIRED_TOKEN for expired reset token", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("from password_resets")) {
			return {
				rows: [
					{
						id: "reset-1",
						user_id: "user-1",
						expires_at: "2020-01-01T00:00:00.000Z",
						consumed_at: null,
					},
				],
			};
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/reset-password",
		payload: {
			token: "expired-token",
			password: "ValidPass123!",
		},
	});

	assert.equal(res.statusCode, 400);
	const body = getJsonRecord(res);
	assert.equal(getRequiredString(body, "code"), "EXPIRED_TOKEN");
	await app.close();
});

test("POST /auth/reset-password returns TOKEN_ALREADY_USED when token was consumed", async () => {
	const app = await buildTestApp(async text => {
		if (text.includes("from password_resets")) {
			return {
				rows: [
					{
						id: "reset-1",
						user_id: "user-1",
						expires_at: "2099-01-01T00:00:00.000Z",
						consumed_at: "2026-02-01T00:00:00.000Z",
					},
				],
			};
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/reset-password",
		payload: {
			token: "used-token",
			password: "ValidPass123!",
		},
	});

	assert.equal(res.statusCode, 409);
	const body = getJsonRecord(res);
	assert.equal(getRequiredString(body, "code"), "TOKEN_ALREADY_USED");
	await app.close();
});

test("POST /auth/change-password returns 200 with valid current password", async () => {
	const oldHash = await argon2.hash("123456");
	let updated = false;
	const app = await buildTestApp(async text => {
		if (text.includes("from users where id = $1")) {
			return {
				rows: [
					{
						id: "user-1",
						email: "admin@camerfirma.com",
						password_hash: oldHash,
						first_name: "Admin",
						last_name: "User",
						second_last_name: null,
						confirmed_at: new Date().toISOString(),
					},
				],
			};
		}
		if (text.includes("update users set password_hash = $1")) {
			updated = true;
			return { rows: [], rowCount: 1 };
		}
		return { rows: [], rowCount: 0 };
	});

	const token = app.jwt.sign({
		id: "user-1",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
	});

	const res = await app.inject({
		method: "POST",
		url: "/auth/change-password",
		headers: { Authorization: `Bearer ${token}` },
		payload: {
			current_password: "123456",
			new_password: "ValidPass123!",
		},
	});

	assert.equal(res.statusCode, 200);
	assert.equal(updated, true);
	await app.close();
});

test("POST /auth/reset-password invalidates previous refresh tokens", async () => {
	const loginHash = await argon2.hash("123456");
	let tokenValidAfter: Date | null = null;
	const app = await buildTestApp(async text => {
		if (text.includes("from users where email = $1")) {
			return {
				rows: [
					{
						id: "user-1",
						email: "admin@camerfirma.com",
						password_hash: loginHash,
						first_name: "Admin",
						last_name: "User",
						second_last_name: null,
						confirmed_at: new Date().toISOString(),
					},
				],
			};
		}

		if (text.includes("SELECT 1 FROM token_revocation WHERE jti = $1")) {
			return { rows: [], rowCount: 0 };
		}

		if (text.includes("select token_valid_after from users where id = $1")) {
			return { rows: [{ token_valid_after: tokenValidAfter }] };
		}

		if (text.includes("from password_resets")) {
			return {
				rows: [
					{
						id: "reset-1",
						user_id: "user-1",
						expires_at: "2099-01-01T00:00:00.000Z",
						consumed_at: null,
					},
				],
			};
		}

		if (text.includes("update password_resets set consumed_at = now()")) {
			return { rows: [{ user_id: "user-1" }], rowCount: 1 };
		}

		if (text.includes("update users set password_hash = $1, token_valid_after = now(), updated_at = now()")) {
			tokenValidAfter = new Date();
			return { rows: [], rowCount: 1 };
		}

		return { rows: [], rowCount: 0 };
	});

	const loginRes = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { email: "admin@camerfirma.com", password: "123456" },
	});
	assert.equal(loginRes.statusCode, 200);
	const loginBody = getJsonRecord(loginRes);
	const initialRefreshToken = getRequiredString(loginBody, "refreshToken");

	const resetRes = await app.inject({
		method: "POST",
		url: "/auth/reset-password",
		payload: {
			token: "raw-token",
			password: "ValidPass123!",
		},
	});
	assert.equal(resetRes.statusCode, 200);

	const refreshRes = await app.inject({
		method: "POST",
		url: "/auth/refresh",
		payload: { token: initialRefreshToken },
	});
	assert.equal(refreshRes.statusCode, 401);

	await app.close();
});

test("POST /auth/change-password invalidates previous refresh tokens", async () => {
	const oldHash = await argon2.hash("123456");
	let tokenValidAfter: Date | null = null;
	const app = await buildTestApp(async text => {
		if (text.includes("from users where email = $1")) {
			return {
				rows: [
					{
						id: "user-1",
						email: "admin@camerfirma.com",
						password_hash: oldHash,
						first_name: "Admin",
						last_name: "User",
						second_last_name: null,
						confirmed_at: new Date().toISOString(),
					},
				],
			};
		}

		if (text.includes("SELECT 1 FROM token_revocation WHERE jti = $1")) {
			return { rows: [], rowCount: 0 };
		}

		if (text.includes("select token_valid_after from users where id = $1")) {
			return { rows: [{ token_valid_after: tokenValidAfter }] };
		}

		if (text.includes("from users where id = $1")) {
			return {
				rows: [
					{
						id: "user-1",
						email: "admin@camerfirma.com",
						password_hash: oldHash,
						first_name: "Admin",
						last_name: "User",
						second_last_name: null,
						confirmed_at: new Date().toISOString(),
					},
				],
			};
		}

		if (text.includes("update users set password_hash = $1, token_valid_after = now(), updated_at = now()")) {
			tokenValidAfter = new Date();
			return { rows: [], rowCount: 1 };
		}

		return { rows: [], rowCount: 0 };
	});

	const loginRes = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { email: "admin@camerfirma.com", password: "123456" },
	});
	assert.equal(loginRes.statusCode, 200);
	const loginBody = getJsonRecord(loginRes);
	const accessToken = getRequiredString(loginBody, "accessToken");
	const initialRefreshToken = getRequiredString(loginBody, "refreshToken");

	const changeRes = await app.inject({
		method: "POST",
		url: "/auth/change-password",
		headers: { Authorization: `Bearer ${accessToken}` },
		payload: {
			current_password: "123456",
			new_password: "ValidPass123!",
		},
	});
	assert.equal(changeRes.statusCode, 200);

	const refreshRes = await app.inject({
		method: "POST",
		url: "/auth/refresh",
		payload: { token: initialRefreshToken },
	});
	assert.equal(refreshRes.statusCode, 401);

	await app.close();
});
