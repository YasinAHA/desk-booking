import type { AuthPolicy } from "../../application/ports/auth-policy.js";

export class DomainAuthPolicy implements AuthPolicy {
	constructor(
		private readonly allowedDomains: string[],
		private readonly emailVerificationTtlMs: number
	) {}

	isAllowedEmail(email: string): boolean {
		const domain = email.split("@")[1]?.toLowerCase();
		return !!domain && this.allowedDomains.includes(domain);
	}

	getEmailVerificationTtlMs(): number {
		return this.emailVerificationTtlMs;
	}
}
