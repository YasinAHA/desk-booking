import type { AllowedEmailDomainRepository } from "@application/auth/ports/allowed-email-domain-repository.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type AllowedDomainRow = {
	domain: string;
};

function isAllowedDomainRow(value: unknown): value is AllowedDomainRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return typeof row.domain === "string";
}

export class PgAllowedEmailDomainRepository implements AllowedEmailDomainRepository {
	constructor(private readonly db: DbClient) {}

	async listAllowedDomains(): Promise<string[]> {
		const result = await this.db.query(
			"select aed.domain::text as domain " +
				"from app_settings s " +
				"join allowed_email_domains aed on aed.app_settings_id = s.id " +
				"where s.scope_type = 'global' " +
				"order by aed.domain asc"
		);
		return result.rows
			.map(row => (isAllowedDomainRow(row) ? row.domain.trim().toLowerCase() : ""))
			.filter(value => value.length > 0);
	}
}
