import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Pool } from "pg";

import { env } from "@config/env.js";
import { buildPgRuntimeConfig, createPgPool } from "@config/pg-runtime.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbDecorated = {
    query: DbQuery;
    pool: Pool;
};

const dbPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    const cfg = buildPgRuntimeConfig({
        DATABASE_URL: env.DATABASE_URL,
        DB_SSL: env.DB_SSL,
        DB_POOL_MAX: env.DB_POOL_MAX,
    });
    const pool = createPgPool(cfg);

    // Initial quick check (fail fast if config is invalid)
    await pool.query("select 1 as ok");

    const db: DbDecorated = {
        pool,
        query: async (text: string, params?: unknown[]) => {
            const result = await pool.query(text, params);
            return {
                rows: result.rows as unknown[],
                rowCount: result.rowCount,
            };
        },
    };

    app.decorate("db", db);

    app.addHook("onClose", async () => {
        await pool.end();
    });

    app.log.info(
        { dbSsl: !!cfg.ssl, dbPoolMax: cfg.max },
        "DB plugin registered"
    );
};

export const registerDbPlugin = fp(dbPlugin, {
    name: "db",
});

