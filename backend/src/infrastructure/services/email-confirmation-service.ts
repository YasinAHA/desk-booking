import type { EmailConfirmationService } from "../../application/ports/email-confirmation-service.js";
import type { Notifier } from "../../application/ports/notifier.js";

export class EmailConfirmationServiceImpl implements EmailConfirmationService {
	constructor(
		private readonly notifier: Notifier,
		private readonly appBaseUrl: string
	) {}

	async sendConfirmation(email: string, token: string): Promise<void> {
		const confirmUrl = `${this.appBaseUrl}/auth/confirm?token=${token}`;
		await this.notifier.send({
			to: email,
			subject: "Confirm your Desk Booking account",
			html: `<p>Confirm your account:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
			text: `Confirm your account: ${confirmUrl}`,
		});
	}
}