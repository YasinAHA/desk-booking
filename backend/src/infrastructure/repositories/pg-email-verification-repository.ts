import type {
	EmailVerificationRecord,
	EmailVerificationRepository,
} from "@application/ports/email-verification-repository.js";

type DbQuery = (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number }>;

type DbClient = {
	query: DbQuery;
};

function mapVerificationRow(row: any): EmailVerificationRecord {
	return {
		id: row.id,
		userId: row.user_id,
		tokenHash: row.token_hash,
		expiresAt: row.expires_at,
		consumedAt: row.consumed_at,
	};
}

export class PgEmailVerificationRepository implements EmailVerificationRepository {
	constructor(private readonly db: DbClient) {}

	async create(
		userId: string,
		tokenHash: string,
		ttlMs: number
	): Promise<void> {
		await this.db.query(
			"insert into email_verifications (user_id, token_hash, expires_at) " +
				"values ($1, $2, now() + ($3::int * interval '1 millisecond'))",
			[userId, tokenHash, ttlMs]
		);
	}

	async findByTokenHash(
		tokenHash: string
	): Promise<EmailVerificationRecord | null> {
		const result = await this.db.query(
			"select id, user_id, token_hash, expires_at, consumed_at " +
				"from email_verifications " +
				"where token_hash = $1 and consumed_at is null and expires_at > now()",
			[tokenHash]
		);
		const row = result.rows[0];
		return row ? mapVerificationRow(row) : null;
	}

	async confirmEmailByTokenHash(tokenHash: string): Promise<boolean> {
		const result = await this.db.query(
			"with verification as (" +
				"select id, user_id from email_verifications " +
				"where token_hash = $1 and consumed_at is null and expires_at > now()" +
			"), consume as (" +
				"update email_verifications set consumed_at = now() " +
				"where id in (select id from verification) " +
				"returning user_id" +
			"), confirm as (" +
				"update users set confirmed_at = now() " +
				"where id in (select user_id from consume) " +
				"and confirmed_at is null " +
				"returning id" +
			") " +
			"select count(*)::int as confirmed_count from confirm",
			[tokenHash]
		);
		return (result.rows[0]?.confirmed_count ?? 0) > 0;
	}

	async consume(id: string): Promise<void> {
		await this.db.query(
			"update email_verifications set consumed_at = now() where id = $1",
			[id]
		);
	}
}
