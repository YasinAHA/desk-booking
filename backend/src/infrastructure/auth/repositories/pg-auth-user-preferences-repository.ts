import type { AuthUserPreferencesRepository } from "@application/auth/ports/user-preferences-repository.js";
import { userIdToString, type UserId } from "@domain/auth/value-objects/user-id.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

export class PgAuthUserPreferencesRepository implements AuthUserPreferencesRepository {
	constructor(private readonly db: DbClient) {}

	async ensureForUser(userId: UserId): Promise<void> {
		await this.db.query(
			"insert into user_preferences (user_id) values ($1) on conflict (user_id) do nothing",
			[userIdToString(userId)]
		);
	}
}

