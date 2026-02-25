import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
	buildPgRuntimeConfig,
	createPgPool,
} from "../../src/config/pg-runtime.js";

function resolveMigrationsDir() {
	const localDir = path.resolve(process.cwd(), "db", "migrations");
	if (existsSync(localDir)) {
		return localDir;
	}
	return path.resolve(process.cwd(), "..", "db", "migrations");
}

async function ensureMigrationsTable(
	pool: ReturnType<typeof createPgPool>
) {
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

	const pool = createPgPool(
		buildPgRuntimeConfig({
			DATABASE_URL: process.env.DATABASE_URL,
			DB_SSL: process.env.DB_SSL,
			DB_POOL_MAX: process.env.DB_POOL_MAX,
		})
	);

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
				await pool.query("insert into schema_migrations (id) values ($1)", [
					file,
				]);
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

