import type {
	ConfirmEmailResult,
	EmailVerificationRecord,
	EmailVerificationRepository,
} from "@application/auth/ports/email-verification-repository.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type EmailVerificationRow = {
	id: string;
	user_id: string;
	token_hash: string;
	expires_at: Date | string;
	consumed_at: Date | string | null;
};

type ConfirmEmailRow = {
	id: string;
	user_id: string;
	expires_at: Date | string;
	consumed_at: Date | string | null;
	confirmed_at: Date | string | null;
};

function isEmailVerificationRow(value: unknown): value is EmailVerificationRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.user_id === "string" &&
		typeof row.token_hash === "string" &&
		(row.expires_at instanceof Date || typeof row.expires_at === "string") &&
		(row.consumed_at === null ||
			row.consumed_at instanceof Date ||
			typeof row.consumed_at === "string")
	);
}

function toEmailVerificationRow(value: unknown): EmailVerificationRow | null {
	return isEmailVerificationRow(value) ? value : null;
}

function isConfirmEmailRow(value: unknown): value is ConfirmEmailRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.user_id === "string" &&
		(row.expires_at instanceof Date || typeof row.expires_at === "string") &&
		(row.consumed_at === null ||
			row.consumed_at instanceof Date ||
			typeof row.consumed_at === "string") &&
		(row.confirmed_at === null ||
			row.confirmed_at instanceof Date ||
			typeof row.confirmed_at === "string")
	);
}

function toConfirmEmailRow(value: unknown): ConfirmEmailRow | null {
	return isConfirmEmailRow(value) ? value : null;
}

function dateToString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function mapVerificationRow(row: EmailVerificationRow): EmailVerificationRecord {
	return {
		id: row.id,
		userId: row.user_id,
		tokenHash: row.token_hash,
		expiresAt: dateToString(row.expires_at),
		consumedAt: row.consumed_at ? dateToString(row.consumed_at) : null,
	};
}

export class PgEmailVerificationRepository implements EmailVerificationRepository {
	constructor(private readonly db: DbClient) {}

	async create(userId: string, tokenHash: string, ttlMs: number): Promise<void> {
		await this.db.query(
			"insert into email_verifications (user_id, token_hash, expires_at) " +
				"values ($1, $2, now() + ($3::int * interval '1 millisecond'))",
			[userId, tokenHash, ttlMs]
		);
	}

	async findByTokenHash(tokenHash: string): Promise<EmailVerificationRecord | null> {
		const result = await this.db.query(
			"select id, user_id, token_hash, expires_at, consumed_at " +
				"from email_verifications " +
				"where token_hash = $1 and consumed_at is null and expires_at > now()",
			[tokenHash]
		);
		const row = toEmailVerificationRow(result.rows[0]);
		return row ? mapVerificationRow(row) : null;
	}

	async confirmEmailByTokenHash(tokenHash: string): Promise<ConfirmEmailResult> {
		const verificationResult = await this.db.query(
			"select ev.id, ev.user_id, ev.expires_at, ev.consumed_at, u.confirmed_at " +
				"from email_verifications ev " +
				"join users u on u.id = ev.user_id " +
				"where ev.token_hash = $1 " +
				"order by ev.created_at desc " +
				"limit 1",
			[tokenHash]
		);

		const verification = toConfirmEmailRow(verificationResult.rows[0]);
		if (!verification) {
			return "invalid_token";
		}

		const expiresAt = new Date(verification.expires_at);
		if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
			return "expired";
		}

		if (verification.consumed_at || verification.confirmed_at) {
			return "already_confirmed";
		}

		const consumeResult = await this.db.query(
			"update email_verifications set consumed_at = now() " +
				"where id = $1 and consumed_at is null and expires_at > now() " +
				"returning user_id",
			[verification.id]
		);
		if ((consumeResult.rowCount ?? 0) === 0) {
			return "already_confirmed";
		}

		const confirmResult = await this.db.query(
			"update users set confirmed_at = now() " +
				"where id = $1 and confirmed_at is null " +
				"returning id",
			[verification.user_id]
		);
		if ((confirmResult.rowCount ?? 0) === 0) {
			return "already_confirmed";
		}

		return "confirmed";
	}

	async consume(id: string): Promise<void> {
		await this.db.query(
			"update email_verifications set consumed_at = now() where id = $1",
			[id]
		);
	}
}
