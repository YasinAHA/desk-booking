import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in environment (.env).");
}

const env = (process.argv[2] ?? "dev").toLowerCase();
const allowed = new Set(["dev", "test", "correction"]);
if (!allowed.has(env)) {
    throw new Error(`Unknown seed environment: ${env}`);
}

const DB_SSL = (process.env.DB_SSL ?? "false").toLowerCase() === "true";
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 10);

function resolveSeedsDir() {
    const localDir = path.resolve(process.cwd(), "db", "seeds");
    if (existsSync(localDir)) {
        return localDir;
    }
    return path.resolve(process.cwd(), "..", "db", "seeds");
}

async function main() {
    const seedsDir = resolveSeedsDir();
    const filePath = path.join(seedsDir, `${env}.sql`);
    const sql = await readFile(filePath, "utf-8");

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DB_SSL ? { rejectUnauthorized: false } : undefined,
        max: DB_POOL_MAX,
    });

    try {
        await pool.query(sql);
        process.stdout.write(`Seed applied for ${env}\n`);
    } finally {
        await pool.end();
    }
}

await main();
