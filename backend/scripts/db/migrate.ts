import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in environment (.env).");
}

const DB_SSL = (process.env.DB_SSL ?? "false").toLowerCase() === "true";
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 10);

function resolveMigrationsDir() {
    const localDir = path.resolve(process.cwd(), "db", "migrations");
    if (existsSync(localDir)) {
        return localDir;
    }
    return path.resolve(process.cwd(), "..", "db", "migrations");
}

async function ensureMigrationsTable(pool: Pool) {
    await pool.query(
        "create table if not exists schema_migrations (" +
            "id text primary key, " +
            "applied_at timestamptz not null default now()" +
        ")"
    );
}

async function main() {
    const migrationsDir = resolveMigrationsDir();
    const files = (await readdir(migrationsDir))
        .filter(file => file.endsWith(".sql"))
        .sort();

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DB_SSL ? { rejectUnauthorized: false } : undefined,
        max: DB_POOL_MAX,
    });

    try {
        await ensureMigrationsTable(pool);
        const appliedRows = await pool.query("select id from schema_migrations");
        const applied = new Set(appliedRows.rows.map(row => row.id as string));

        for (const file of files) {
            if (applied.has(file)) {
                continue;
            }

            const sql = await readFile(path.join(migrationsDir, file), "utf-8");

            await pool.query("begin");
            try {
                await pool.query(sql);
                await pool.query("insert into schema_migrations (id) values ($1)", [file]);
                await pool.query("commit");
                process.stdout.write(`Applied migration ${file}\n`);
            } catch (err) {
                await pool.query("rollback");
                throw err;
            }
        }
    } finally {
        await pool.end();
    }
}

await main();
