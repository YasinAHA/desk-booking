import type { ForgotPasswordCommand } from "@application/auth/commands/forgot-password.command.js";
import type { AuthDependencies, ForgotPasswordResult } from "@application/auth/types.js";
import { EmailTemplateProvider } from "@application/auth/services/email-template-provider.js";
import { AUTH_FORGOT_PASSWORD_MIN_RESPONSE_MS } from "@config/constants.js";
import { InvalidEmailError } from "@domain/auth/errors/auth-domain-errors.js";
import { createEmail, emailToString } from "@domain/auth/value-objects/email.js";
import { userIdToString } from "@domain/auth/value-objects/user-id.js";

type ForgotPasswordDependencies = Pick<
	AuthDependencies,
	| "authPolicy"
	| "tokenService"
	| "txManager"
	| "userRepo"
	| "passwordResetRepoFactory"
	| "recoveryAttemptPolicyService"
	| "emailOutbox"
	| "passwordResetBaseUrl"
>;

export class ForgotPasswordHandler {
	private readonly emailTemplateProvider = new EmailTemplateProvider();

	constructor(private readonly deps: ForgotPasswordDependencies) {}

	async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
		const startedAtMs = Date.now();
		try {
			const attempt = this.deps.recoveryAttemptPolicyService.consumeForgotPasswordAttempt(
				command.email
			);
			if (!attempt.allowed) {
				return { status: "RATE_LIMITED", emailHash: attempt.emailHash };
			}

			if (!this.deps.authPolicy.isAllowedEmail(command.email)) {
				return { status: "OK", emailHash: attempt.emailHash };
			}

			let emailVO;
			try {
				emailVO = createEmail(command.email);
			} catch (error) {
				if (!(error instanceof InvalidEmailError)) {
					throw error;
				}
				return { status: "OK", emailHash: attempt.emailHash };
			}

			const user = await this.deps.userRepo.findByEmail(emailVO);
			if (!user) {
				return { status: "OK", emailHash: attempt.emailHash };
			}

			const token = this.deps.tokenService.generate();
			const tokenHash = this.deps.tokenService.hash(token);
			const ttlMs = this.deps.authPolicy.getPasswordResetTtlMs();

			await this.deps.txManager.runInTransaction(async tx => {
				const passwordResetRepo = this.deps.passwordResetRepoFactory(tx);
				await passwordResetRepo.create(userIdToString(user.id), tokenHash, ttlMs);
			});

			const resetUrl = new URL(this.deps.passwordResetBaseUrl);
			resetUrl.hash = `token=${encodeURIComponent(token)}`;
			const template = this.emailTemplateProvider.buildPasswordResetTemplate(
				resetUrl.toString()
			);

			await this.deps.emailOutbox.enqueue({
				to: emailToString(user.email),
				subject: template.subject,
				body: template.body,
				type: "password_reset",
			});

			return { status: "OK", emailHash: attempt.emailHash };
		} finally {
			const elapsedMs = Date.now() - startedAtMs;
			if (elapsedMs < AUTH_FORGOT_PASSWORD_MIN_RESPONSE_MS) {
				const waitMs = AUTH_FORGOT_PASSWORD_MIN_RESPONSE_MS - elapsedMs;
				await new Promise(resolve => setTimeout(resolve, waitMs));
			}
		}
	}
}
