import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import Fastify from "fastify";
import { SignJWT } from "jose";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";

const { meRoutes } = await import("./me.routes.js");
const { registerAuthPlugin } = await import("@interfaces/http/plugins/auth.js");

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

async function buildToken(userId = "user-1"): Promise<string> {
	return await new SignJWT({
		id: userId,
		email: "user@camerfirma.com",
		firstName: "User",
		lastName: "One",
		secondLastName: null,
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
				email: "user@camerfirma.com",
				firstName: "User",
				lastName: "One",
				secondLastName: null,
				jti: randomUUID(),
				type: "access" as const,
				iat: Math.floor(Date.now() / 1000),
			};
		},
	} as unknown as import("@application/auth/services/auth-session-lifecycle.service.js").AuthSessionLifecycleService;

	await app.register(registerAuthPlugin, { authSessionLifecycleService });
	await app.register(meRoutes, { prefix: "/me" });
	await app.ready();
	return app;
}

test("GET /me/preferences returns 401 without token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));
	const res = await app.inject({ method: "GET", url: "/me/preferences" });
	assert.equal(res.statusCode, 401);
	await app.close();
});

test("GET /me/preferences returns preferences for authenticated user", async () => {
	const app = await buildTestApp(async (text, params) => {
		if (text.includes("insert into user_preferences")) {
			assert.equal(params?.[0], "user-1");
			return { rows: [], rowCount: 1 };
		}
		if (text.includes("select user_id, theme")) {
			return {
				rows: [{
					user_id: "user-1",
					theme: "system",
					language: "es",
					timezone: "Europe/Madrid",
					email_notifications_enabled: true,
					created_at: "2026-03-19T08:00:00.000Z",
					updated_at: "2026-03-19T08:00:00.000Z",
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/me/preferences",
		headers: { Authorization: `Bearer ${await buildToken("user-1")}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.userId, "user-1");
	assert.equal(body.theme, "system");
	assert.equal(body.timezone, "Europe/Madrid");
	await app.close();
});

test("PATCH /me/preferences returns 400 for invalid payload", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));
	const res = await app.inject({
		method: "PATCH",
		url: "/me/preferences",
		headers: { Authorization: `Bearer ${await buildToken("user-1")}` },
		payload: {},
	});
	assert.equal(res.statusCode, 400);
	await app.close();
});

test("PATCH /me/preferences updates preferences and returns updated values", async () => {
	const app = await buildTestApp(async (text, params) => {
		if (text.includes("insert into user_preferences")) {
			return { rows: [], rowCount: 1 };
		}
		if (text.includes("update user_preferences set")) {
			assert.equal(params?.at(-1), "user-1");
			return {
				rows: [{
					user_id: "user-1",
					theme: "dark",
					language: "en",
					timezone: "UTC",
					email_notifications_enabled: false,
					created_at: "2026-03-19T08:00:00.000Z",
					updated_at: "2026-03-19T09:00:00.000Z",
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/me/preferences",
		headers: { Authorization: `Bearer ${await buildToken("user-1")}` },
		payload: {
			theme: "dark",
			language: "en",
			timezone: "UTC",
			emailNotificationsEnabled: false,
		},
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.theme, "dark");
	assert.equal(body.language, "en");
	assert.equal(body.emailNotificationsEnabled, false);
	await app.close();
});

