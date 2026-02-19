import type { Pool } from "pg";
import type { TokenRevocationRepository } from "@application/auth/ports/token-revocation-repository.js";

export class TokenRevocationRepositoryError extends Error {
	constructor(message: string, cause: unknown) {
		super(message, { cause });
		this.name = "TokenRevocationRepositoryError";
	}
}

/**
 * PostgreSQL implementation of TokenRevocationRepository
 * Manages revoked tokens (JTI blacklist) in the database
 */
export class PgTokenRevocationRepository implements TokenRevocationRepository {
	constructor(private readonly pool: Pool) {}

	/**
	 * Revoke a token by adding its JTI to the blacklist
	 */
	async revoke(jti: string, userId: string, expiresAt: Date): Promise<void> {
		try {
			await this.pool.query(
				`INSERT INTO token_revocation (jti, user_id, expires_at)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (jti) DO NOTHING`,
				[jti, userId, expiresAt]
			);
		} catch (error) {
			throw new TokenRevocationRepositoryError("Failed to revoke token", error);
		}
	}

	/**
	 * Check if a JTI has been revoked
	 */
	async isRevoked(jti: string): Promise<boolean> {
		try {
			const result = await this.pool.query(
				`SELECT 1 FROM token_revocation WHERE jti = $1 LIMIT 1`,
				[jti]
			);
			return (result.rowCount ?? 0) > 0;
		} catch (error) {
			throw new TokenRevocationRepositoryError(
				"Failed to check revocation status",
				error
			);
		}
	}

	/**
	 * Clean up expired tokens from blacklist
	 * Can be called periodically by a background job
	 */
	async cleanupExpired(): Promise<void> {
		try {
			await this.pool.query(
				`DELETE FROM token_revocation WHERE expires_at < CURRENT_TIMESTAMP`
			);
		} catch (error) {
			throw new TokenRevocationRepositoryError(
				"Failed to cleanup expired tokens",
				error
			);
		}
	}
}
