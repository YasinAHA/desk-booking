import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
	buildPgRuntimeConfig,
	createPgPool,
} from "../../src/config/pg-runtime.js";

const seedEnvironment = (process.argv[2] ?? "dev").toLowerCase();
const allowed = new Set(["dev", "test", "correction"]);
if (!allowed.has(seedEnvironment)) {
	throw new Error(`Unknown seed environment: ${seedEnvironment}`);
}

function resolveSeedsDir() {
	const localDir = path.resolve(process.cwd(), "db", "seeds");
	if (existsSync(localDir)) {
		return localDir;
	}
	return path.resolve(process.cwd(), "..", "db", "seeds");
}

async function main() {
	const seedsDir = resolveSeedsDir();
	const filePath = path.join(seedsDir, `${seedEnvironment}.sql`);
	const sql = await readFile(filePath, "utf-8");

	const pool = createPgPool(
		buildPgRuntimeConfig({
			DATABASE_URL: process.env.DATABASE_URL,
			DB_SSL: process.env.DB_SSL,
			DB_POOL_MAX: process.env.DB_POOL_MAX,
		})
	);

	try {
		await pool.query(sql);
		process.stdout.write(`Seed applied for ${seedEnvironment}\n`);
	} finally {
		await pool.end();
	}
}

await main();

