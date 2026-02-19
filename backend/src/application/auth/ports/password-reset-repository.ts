import type { PasswordHash } from "@domain/auth/value-objects/password-hash.js";

export type ResetPasswordResult =
	| "password_reset"
	| "invalid_token"
	| "expired"
	| "already_used";

export interface PasswordResetRepository {
	create(userId: string, tokenHash: string, ttlMs: number): Promise<void>;
	resetPasswordByTokenHash(
		tokenHash: string,
		passwordHash: PasswordHash
	): Promise<ResetPasswordResult>;
}
