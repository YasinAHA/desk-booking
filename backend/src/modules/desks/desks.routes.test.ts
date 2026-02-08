import assert from "node:assert/strict";
import test from "node:test";

import Fastify from "fastify";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_EMAIL_DOMAINS = "camerfirma.com";

const { desksRoutes } = await import("./desks.routes.js");
const { registerAuthPlugin } = await import("../../plugins/auth.js");

type DbQuery = (text: string, params?: unknown[]) => Promise<any>;

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
    const app = await buildTestApp(async () => ({
        rows: [
            {
                id: "desk-1",
                code: "D01",
                name: "Puesto 01",
                is_active: true,
                is_reserved: false,
                is_mine: false,
                reservation_id: null,
                occupant_name: null,
            },
        ],
    }));

    const token = app.jwt.sign({
        id: "user-1",
        email: "admin@camerfirma.com",
        displayName: "Admin",
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
