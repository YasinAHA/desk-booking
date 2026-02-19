import type { Pool } from "pg";
import type { UserSessionRepository } from "@application/auth/ports/user-session-repository.js";

type TokenValidAfterRow = {
	token_valid_after: Date | string | null;
};

function toDate(value: Date | string | null): Date | null {
	if (value === null) {
		return null;
	}
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export class PgUserSessionRepository implements UserSessionRepository {
	constructor(private readonly pool: Pool) {}

	async getTokenValidAfter(userId: string): Promise<Date | null> {
		const result = await this.pool.query(
			"select token_valid_after from users where id = $1 limit 1",
			[userId]
		);

		const row = result.rows[0] as TokenValidAfterRow | undefined;
		return row ? toDate(row.token_valid_after) : null;
	}
}

