import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import argon2 from "argon2";
import type { FastifyInstance } from "fastify";

type MockDb = {
    query: (text: string, params?: unknown[]) => Promise<any>;
};

type MockApp = {
    db: MockDb;
};

function mockApp(db: MockDb): FastifyInstance {
    return { db } as unknown as FastifyInstance;
}

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_EMAIL_DOMAINS = "camerfirma.com";

const { loginWithPassword, registerUser, confirmEmail } = await import(
    "./auth.service.js"
);

test("loginWithPassword rejects non-allowed domain", async () => {
    const app = mockApp({
        query: async () => {
            throw new Error("DB should not be called");
        },
    });

    const result = await loginWithPassword(
        app,
        "user@other.com",
        "1234"
    );
    assert.equal(result, null);
});

test("loginWithPassword returns null when user not found", async () => {
    const app = mockApp({
        query: async (text, params) => {
            assert.ok(text.includes("from users"));
            assert.deepEqual(params, ["admin@camerfirma.com"]);
            return { rows: [] };
        },
    });

    const result = await loginWithPassword(
        app,
        "admin@camerfirma.com",
        "1234"
    );
    assert.equal(result, null);
});

test("loginWithPassword returns null on bad password", async () => {
    const hash = await argon2.hash("correct");
    const app = mockApp({
        query: async () => ({
            rows: [
                {
                    id: "user-1",
                    email: "admin@camerfirma.com",
                    password_hash: hash,
                    display_name: "Admin",
                    confirmed_at: new Date().toISOString(),
                },
            ],
        }),
    });

    const result = await loginWithPassword(
        app,
        "admin@camerfirma.com",
        "wrong"
    );
    assert.equal(result, null);
});

test("loginWithPassword returns NOT_CONFIRMED when user not confirmed", async () => {
    const hash = await argon2.hash("1234");
    const app = mockApp({
        query: async () => ({
            rows: [
                {
                    id: "user-1",
                    email: "admin@camerfirma.com",
                    password_hash: hash,
                    display_name: "Admin",
                    confirmed_at: null,
                },
            ],
        }),
    });

    const result = await loginWithPassword(
        app,
        "admin@camerfirma.com",
        "1234"
    );

    assert.deepEqual(result, { status: "NOT_CONFIRMED" });
});

test("loginWithPassword returns user on success", async () => {
    const hash = await argon2.hash("1234");
    const app = mockApp({
        query: async () => ({
            rows: [
                {
                    id: "user-1",
                    email: "admin@camerfirma.com",
                    password_hash: hash,
                    display_name: "Admin",
                    confirmed_at: new Date().toISOString(),
                },
            ],
        }),
    });

    const result = await loginWithPassword(
        app,
        "admin@camerfirma.com",
        "1234"
    );

    assert.deepEqual(result, {
        status: "OK",
        user: {
            id: "user-1",
            email: "admin@camerfirma.com",
            displayName: "Admin",
        },
    });
});

test("registerUser rejects non-allowed domain", async () => {
    const app = mockApp({
        query: async () => {
            throw new Error("DB should not be called");
        },
    });

    const result = await registerUser(app, "user@other.com", "123456", "User");
    assert.deepEqual(result, { status: "DOMAIN_NOT_ALLOWED" });
});

test("registerUser returns ALREADY_CONFIRMED when user exists", async () => {
    const app = mockApp({
        query: async (text) => {
            assert.ok(text.includes("from users"));
            return { rows: [{ id: "user-1", confirmed_at: new Date().toISOString() }] };
        },
    });

    const result = await registerUser(app, "admin@camerfirma.com", "123456");
    assert.deepEqual(result, { status: "ALREADY_CONFIRMED" });
});

test("registerUser creates verification for existing unconfirmed user", async () => {
    let called = 0;
    const app = mockApp({
        query: async (text, params) => {
            called += 1;
            if (called === 1) {
                assert.ok(text.includes("from users"));
                return { rows: [{ id: "user-1", confirmed_at: null }] };
            }
            if (called === 2) {
                assert.ok(text.startsWith("update users"));
                assert.equal(params?.[2], "user-1");
                return { rowCount: 1 };
            }
            assert.ok(text.includes("email_verifications"));
            return { rowCount: 1 };
        },
    });

    const result = await registerUser(app, "admin@camerfirma.com", "123456");
    assert.equal(result.status, "OK");
    assert.equal(typeof result.token, "string");
});

test("registerUser inserts new user and verification", async () => {
    let called = 0;
    const app = mockApp({
        query: async (text) => {
            called += 1;
            if (called === 1) {
                return { rows: [] };
            }
            if (called === 2) {
                assert.ok(text.startsWith("insert into users"));
                return { rows: [{ id: "user-2" }] };
            }
            assert.ok(text.includes("email_verifications"));
            return { rowCount: 1 };
        },
    });

    const result = await registerUser(app, "admin@camerfirma.com", "123456");
    assert.equal(result.status, "OK");
});

test("confirmEmail returns false for invalid token", async () => {
    const app = mockApp({
        query: async (text, params) => {
            assert.ok(text.includes("from email_verifications"));
            assert.equal(Array.isArray(params), true);
            return { rows: [] };
        },
    });

    const ok = await confirmEmail(app, "bad-token");
    assert.equal(ok, false);
});

test("confirmEmail marks user and verification", async () => {
    let called = 0;
    const token = "token-123";
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const app = mockApp({
        query: async (text, params) => {
            called += 1;
            if (called === 1) {
                assert.ok(text.includes("from email_verifications"));
                assert.deepEqual(params, [tokenHash]);
                return { rows: [{ id: "ver-1", user_id: "user-1" }] };
            }
            if (called === 2) {
                assert.ok(text.startsWith("update users"));
                assert.deepEqual(params, ["user-1"]);
                return { rowCount: 1 };
            }
            assert.ok(text.startsWith("update email_verifications"));
            assert.deepEqual(params, ["ver-1"]);
            return { rowCount: 1 };
        },
    });

    const ok = await confirmEmail(app, token);
    assert.equal(ok, true);
});
