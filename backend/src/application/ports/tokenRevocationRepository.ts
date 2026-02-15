/**
 * TokenRevocationRepository Port
 * Defines interface for storing and checking revoked tokens (JTI)
 */
export interface TokenRevocationRepository {
	/**
	 * Revoke a token by adding its JTI to the blacklist
	 * @param jti JWT ID (unique token identifier)
	 * @param userId User ID who owned the token
	 * @param expiresAt Token expiration date (cleanup after this)
	 */
	revoke(jti: string, userId: string, expiresAt: Date): Promise<void>;

	/**
	 * Check if a JTI has been revoked
	 * @param jti JWT ID to check
	 * @returns true if revoked, false if valid
	 */
	isRevoked(jti: string): Promise<boolean>;

	/**
	 * Clean up expired tokens from blacklist
	 * Tokens older than current time don't need to be stored
	 */
	cleanupExpired(): Promise<void>;
}
