import type { AuthPolicy } from "@application/auth/ports/auth-policy.js";

export class DomainAuthPolicy implements AuthPolicy {
	constructor(
		private readonly allowedDomains: string[],
		private readonly emailVerificationTtlMs: number,
		private readonly passwordResetTtlMs: number
	) {}

	isAllowedEmail(email: string): boolean {
		const domain = email.split("@")[1]?.toLowerCase();
		return !!domain && this.allowedDomains.includes(domain);
	}

	getEmailVerificationTtlMs(): number {
		return this.emailVerificationTtlMs;
	}

	getPasswordResetTtlMs(): number {
		return this.passwordResetTtlMs;
	}
}

