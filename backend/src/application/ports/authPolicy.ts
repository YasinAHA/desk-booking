export interface AuthPolicy {
	isAllowedEmail(email: string): boolean;
	getEmailVerificationTtlMs(): number;
}
