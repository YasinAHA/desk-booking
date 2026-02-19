import type { ForgotPasswordCommand } from "@application/auth/commands/forgot-password.command.js";
import type { AuthDependencies, ForgotPasswordResult } from "@application/auth/types.js";
import { createEmail, emailToString } from "@domain/auth/value-objects/email.js";
import { userIdToString } from "@domain/auth/value-objects/user-id.js";

type ForgotPasswordDependencies = Pick<
	AuthDependencies,
	| "authPolicy"
	| "tokenService"
	| "txManager"
	| "userRepo"
	| "passwordResetRepoFactory"
	| "emailOutbox"
	| "passwordResetBaseUrl"
>;

export class ForgotPasswordHandler {
	constructor(private readonly deps: ForgotPasswordDependencies) {}

	async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
		if (!this.deps.authPolicy.isAllowedEmail(command.email)) {
			return { status: "OK" };
		}

		let emailVO;
		try {
			emailVO = createEmail(command.email);
		} catch {
			return { status: "OK" };
		}

		const user = await this.deps.userRepo.findByEmail(emailVO);
		if (!user) {
			return { status: "OK" };
		}

		const token = this.deps.tokenService.generate();
		const tokenHash = this.deps.tokenService.hash(token);
		const ttlMs = this.deps.authPolicy.getPasswordResetTtlMs();

		await this.deps.txManager.runInTransaction(async tx => {
			const passwordResetRepo = this.deps.passwordResetRepoFactory(tx);
			await passwordResetRepo.create(userIdToString(user.id), tokenHash, ttlMs);
		});

		const resetUrl = `${this.deps.passwordResetBaseUrl}/auth/reset-password?token=${token}`;
		const htmlBody = [
			"<div style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #222;\">",
			"<h2 style=\"margin: 0 0 12px;\">Reset your password</h2>",
			"<p>We received a request to reset your password.</p>",
			"<p style=\"margin: 20px 0;\">",
			`<a href="${resetUrl}" style="background: #0b5fff; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none; display: inline-block;">Reset password</a>`,
			"</p>",
			"<p>If the button doesn't work, copy and paste this link:</p>",
			`<p><a href="${resetUrl}">${resetUrl}</a></p>`,
			"<p style=\"color: #666; font-size: 12px;\">If you did not request this, you can ignore this email.</p>",
			"</div>",
		].join("");

		await this.deps.emailOutbox.enqueue({
			to: emailToString(user.email),
			subject: "Reset your Desk Booking password",
			body: htmlBody,
			type: "password_reset",
		});

		return { status: "OK" };
	}
}
