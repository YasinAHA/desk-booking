import type { TokenService } from "@application/auth/ports/token-service.js";
import { RecoveryRateLimiter } from "@application/auth/services/recovery-rate-limiter.js";

type RecoveryAttemptPolicyConfig = {
	forgotPasswordIdentifier: {
		max: number;
		timeWindowMs: number;
	};
	resetPasswordIdentifier: {
		max: number;
		timeWindowMs: number;
	};
};

export class RecoveryAttemptPolicyService {
	private readonly forgotPasswordLimiter: RecoveryRateLimiter;
	private readonly resetPasswordLimiter: RecoveryRateLimiter;

	constructor(
		private readonly tokenService: TokenService,
		config: RecoveryAttemptPolicyConfig
	) {
		this.forgotPasswordLimiter = new RecoveryRateLimiter(
			config.forgotPasswordIdentifier.max,
			config.forgotPasswordIdentifier.timeWindowMs
		);
		this.resetPasswordLimiter = new RecoveryRateLimiter(
			config.resetPasswordIdentifier.max,
			config.resetPasswordIdentifier.timeWindowMs
		);
	}

	hashIdentifier(value: string): string {
		return this.tokenService.hash(value);
	}

	consumeForgotPasswordAttempt(email: string): { allowed: boolean; emailHash: string } {
		const emailHash = this.hashIdentifier(email);
		return {
			allowed: this.forgotPasswordLimiter.consume(emailHash),
			emailHash,
		};
	}

	consumeResetPasswordAttempt(token: string): { allowed: boolean; tokenHash: string } {
		const tokenHash = this.hashIdentifier(token);
		return {
			allowed: this.resetPasswordLimiter.consume(tokenHash),
			tokenHash,
		};
	}
}
