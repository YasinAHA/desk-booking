import assert from "node:assert/strict";
import test from "node:test";

import type { FastifyInstance } from "fastify";

import {
    cancelReservation,
    createReservation,
    listMyReservations,
} from "./reservations.service.js";

type MockDb = {
    query: (text: string, params?: unknown[]) => Promise<any>;
};

type MockApp = {
    db: MockDb;
};

function mockApp(db: MockDb): FastifyInstance {
    return { db } as unknown as FastifyInstance;
}

test("createReservation throws on past date", async () => {
    const app = mockApp({
        query: async () => {
            throw new Error("DB should not be called");
        },
    });

    await assert.rejects(
        () => createReservation(app, "user", "2000-01-01", "desk"),
        { message: "DATE_IN_PAST" }
    );
});

test("createReservation inserts and returns id", async () => {
    const app = mockApp({
        query: async (text, params) => {
            assert.ok(text.includes("insert into reservations"));
            assert.deepEqual(params, ["user", "desk", "2026-02-20"]);
            return { rows: [{ id: "res-1" }] };
        },
    });

    const id = await createReservation(app, "user", "2026-02-20", "desk");
    assert.equal(id, "res-1");
});

test("cancelReservation returns true when row updated", async () => {
    const app = mockApp({
        query: async () => ({ rowCount: 1 }),
    });

    const ok = await cancelReservation(app, "user", "res-1");
    assert.equal(ok, true);
});

test("cancelReservation returns false when nothing updated", async () => {
    const app = mockApp({
        query: async () => ({ rowCount: 0 }),
    });

    const ok = await cancelReservation(app, "user", "res-2");
    assert.equal(ok, false);
});

test("listMyReservations returns rows", async () => {
    const rows = [
        {
            id: "res-1",
            desk_id: "desk-1",
            desk_name: "Puesto 01",
            reserved_date: "2026-02-20",
            cancelled_at: null,
        },
    ];

    const app = mockApp({
        query: async (text, params) => {
            assert.ok(text.includes("from reservations"));
            assert.deepEqual(params, ["user"]);
            return { rows };
        },
    });

    const result = await listMyReservations(app, "user");
    assert.deepEqual(result, rows);
});
