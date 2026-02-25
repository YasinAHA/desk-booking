import type { AuthPolicy } from "@application/auth/ports/auth-policy.js";
import type {
	ConfirmEmailResult,
	EmailVerificationRepository,
} from "@application/auth/ports/email-verification-repository.js";
import type { EmailOutbox } from "@application/auth/ports/email-outbox.js";
import type { TokenService } from "@application/auth/ports/token-service.js";
import { EmailTemplateProvider } from "@application/auth/services/email-template-provider.js";
import { userIdToString, type UserId } from "@domain/auth/value-objects/user-id.js";

/**
 * EmailVerificationService - Handles email verification workflow
 */
export class EmailVerificationService {
	private readonly emailTemplateProvider = new EmailTemplateProvider();

	constructor(
		private readonly emailVerificationRepo: EmailVerificationRepository,
		private readonly emailOutbox: EmailOutbox,
		private readonly authPolicy: AuthPolicy,
		private readonly tokenService: TokenService,
		private readonly confirmationBaseUrl: string
	) {}

	async sendVerificationEmail(
		userId: UserId,
		email: string
	): Promise<void> {
		const token = this.tokenService.generate();
		const tokenHash = this.tokenService.hash(token);
		const ttlMs = this.authPolicy.getEmailVerificationTtlMs();

		await this.emailVerificationRepo.create(
			userIdToString(userId),
			tokenHash,
			ttlMs
		);

		const confirmUrl = `${this.confirmationBaseUrl}/auth/confirm?token=${token}`;
		const template = this.emailTemplateProvider.buildVerificationTemplate(confirmUrl);

		await this.emailOutbox.enqueue({
			to: email,
			subject: template.subject,
			body: template.body,
			type: "email_confirmation",
		});
	}

	async confirmEmail(token: string): Promise<ConfirmEmailResult> {
		const tokenHash = this.tokenService.hash(token);
		return this.emailVerificationRepo.confirmEmailByTokenHash(tokenHash);
	}
}
