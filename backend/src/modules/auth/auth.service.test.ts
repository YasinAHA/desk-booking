import assert from "node:assert/strict";
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

const { loginWithPassword } = await import("./auth.service.js");

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
        id: "user-1",
        email: "admin@camerfirma.com",
        displayName: "Admin",
    });
});
