import type { UserId } from "../../domain/valueObjects/userId.js";
import { userIdToString } from "../../domain/valueObjects/userId.js";
import type { AuthPolicy } from "../ports/authPolicy.js";
import type { EmailOutbox } from "../ports/email-outbox.js";
import type { EmailVerificationRepository } from "../ports/email-verification-repository.js";
import type { TokenService } from "../ports/token-service.js";

/**
 * EmailVerificationService - Handles email verification workflow
 *
 * Responsibilities:
 * - Generate verification tokens
 * - Create verification records in DB
 * - Build and enqueue confirmation emails
 */
export class EmailVerificationService {
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
		const subject = "Confirm your Desk Booking account";
		const htmlBody = [
			"<div style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #222;\">",
			"<h2 style=\"margin: 0 0 12px;\">Confirm your email</h2>",
			"<p>Thanks for signing up. Click the button below to confirm your account.</p>",
			"<p style=\"margin: 20px 0;\">",
			`<a href="${confirmUrl}" style="background: #0b5fff; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none; display: inline-block;">Confirm email</a>`,
			"</p>",
			"<p>If the button doesn't work, copy and paste this link:</p>",
			`<p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
			"<p style=\"color: #666; font-size: 12px;\">If you did not request this, you can ignore this email.</p>",
			"</div>",
		].join("");

		await this.emailOutbox.enqueue({
			to: email,
			subject,
			body: htmlBody,
			type: "email_confirmation",
		});
	}

	async confirmEmail(token: string): Promise<boolean> {
		const tokenHash = this.tokenService.hash(token);
		return this.emailVerificationRepo.confirmEmailByTokenHash(tokenHash);
	}
}
