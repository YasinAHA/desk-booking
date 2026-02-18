export type EmailVerificationRecord = {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: string;
	consumedAt: string | null;
};

export type ConfirmEmailResult =
	| "confirmed"
	| "invalid_token"
	| "expired"
	| "already_confirmed";

export interface EmailVerificationRepository {
	create(
		userId: string,
		tokenHash: string,
		ttlMs: number
	): Promise<void>;
	findByTokenHash(
		tokenHash: string
	): Promise<EmailVerificationRecord | null>;
	confirmEmailByTokenHash(tokenHash: string): Promise<ConfirmEmailResult>;
	consume(id: string): Promise<void>;
}
