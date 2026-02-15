export type EmailVerificationRecord = {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: string;
	consumedAt: string | null;
};

export interface EmailVerificationRepository {
	create(
		userId: string,
		tokenHash: string,
		ttlMs: number
	): Promise<void>;
	findByTokenHash(
		tokenHash: string
	): Promise<EmailVerificationRecord | null>;
	confirmEmailByTokenHash(tokenHash: string): Promise<boolean>;
	consume(id: string): Promise<void>;
}
