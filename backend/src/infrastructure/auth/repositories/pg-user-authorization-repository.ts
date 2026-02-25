import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";

type DbQueryResult = {
	rows: unknown[];
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type UserRoleRow = {
	role: unknown;
};

export class PgUserAuthorizationRepository implements UserAuthorizationRepository {
	constructor(private readonly db: DbClient) {}

	async isAdminUser(userId: string): Promise<boolean> {
		const result = await this.db.query("select role from users where id = $1 limit 1", [userId]);
		const row = result.rows[0] as UserRoleRow | undefined;
		return row?.role === "admin";
	}
}

