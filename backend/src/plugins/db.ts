import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Pool } from "pg";

type DbQuery = (text: string, params?: unknown[]) => Promise<any>;

type DbDecorated = {
    query: DbQuery;
    pool: Pool;
};

function getDbConfig() {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error("Missing DATABASE_URL in environment (.env).");
    }

    // Opcional: en local normalmente false; en prod suele ser true con SSL.
    const DB_SSL = (process.env.DB_SSL ?? "false").toLowerCase() === "true";

    return {
        connectionString: DATABASE_URL,
        ssl: DB_SSL ? { rejectUnauthorized: false } : undefined,
        max: Number(process.env.DB_POOL_MAX ?? 10),
    };
}

const dbPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    const cfg = getDbConfig();
    const pool = new Pool({
        connectionString: cfg.connectionString,
        ssl: cfg.ssl,
        max: cfg.max,
    });

    // Test inicial rápido (falla pronto si hay config mala)
    await pool.query("select 1 as ok");

    const db: DbDecorated = {
        pool,
        query: (text: string, params?: unknown[]) => pool.query(text, params),
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
