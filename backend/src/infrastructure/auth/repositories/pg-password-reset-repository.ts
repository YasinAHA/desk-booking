import type {
	PasswordResetRepository,
	ResetPasswordResult,
} from "@application/auth/ports/password-reset-repository.js";
import {
	passwordHashToString,
	type PasswordHash,
} from "@domain/auth/value-objects/password-hash.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type PasswordResetRow = {
	id: string;
	user_id: string;
	expires_at: Date | string;
	consumed_at: Date | string | null;
};

function isPasswordResetRow(value: unknown): value is PasswordResetRow {
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
			typeof row.consumed_at === "string")
	);
}

function toPasswordResetRow(value: unknown): PasswordResetRow | null {
	return isPasswordResetRow(value) ? value : null;
}

export class PgPasswordResetRepository implements PasswordResetRepository {
	constructor(private readonly db: DbClient) {}

	async create(userId: string, tokenHash: string, ttlMs: number): Promise<void> {
		await this.db.query(
			"insert into password_resets (user_id, token_hash, expires_at) " +
				"values ($1, $2, now() + ($3::int * interval '1 millisecond'))",
			[userId, tokenHash, ttlMs]
		);
	}

	async resetPasswordByTokenHash(
		tokenHash: string,
		passwordHash: PasswordHash
	): Promise<ResetPasswordResult> {
		const resetResult = await this.db.query(
			"select id, user_id, expires_at, consumed_at " +
				"from password_resets " +
				"where token_hash = $1 " +
				"order by created_at desc " +
				"limit 1",
			[tokenHash]
		);

		const resetRow = toPasswordResetRow(resetResult.rows[0]);
		if (!resetRow) {
			return "invalid_token";
		}

		const expiresAt = new Date(resetRow.expires_at);
		if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
			return "expired";
		}

		if (resetRow.consumed_at) {
			return "already_used";
		}

		const consumeResult = await this.db.query(
			"update password_resets set consumed_at = now() " +
				"where id = $1 and consumed_at is null and expires_at > now() " +
				"returning user_id",
			[resetRow.id]
		);
		if ((consumeResult.rowCount ?? 0) === 0) {
			return "already_used";
		}

		await this.db.query(
			"update users set password_hash = $1, updated_at = now() " +
				"where id = $2",
			[
				passwordHashToString(passwordHash),
				resetRow.user_id,
			]
		);

		return "password_reset";
	}
}
