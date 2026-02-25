import { Pool, type PoolConfig } from "pg";

type EnvLike = {
	DATABASE_URL?: string;
	DB_SSL?: boolean | string;
	DB_POOL_MAX?: number | string;
};

export type PgRuntimeConfig = {
	connectionString: string;
	ssl: PoolConfig["ssl"];
	max: number;
};

function parseBoolean(value: boolean | string | undefined): boolean {
	if (typeof value === "boolean") {
		return value;
	}
	return (value ?? "false").toLowerCase() === "true";
}

function parsePoolMax(value: number | string | undefined): number {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return Math.trunc(value);
	}
	const parsed = Number(value ?? 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return 10;
	}
	return Math.trunc(parsed);
}

export function buildPgRuntimeConfig(input: EnvLike): PgRuntimeConfig {
	const connectionString = input.DATABASE_URL;
	if (!connectionString) {
		throw new Error("Missing DATABASE_URL in environment.");
	}

	const sslEnabled = parseBoolean(input.DB_SSL);
	return {
		connectionString,
		ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
		max: parsePoolMax(input.DB_POOL_MAX),
	};
}

export function createPgPool(config: PgRuntimeConfig): Pool {
	return new Pool({
		connectionString: config.connectionString,
		ssl: config.ssl,
		max: config.max,
	});
}
