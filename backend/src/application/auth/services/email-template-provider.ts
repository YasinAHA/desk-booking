export type EmailTemplate = {
	subject: string;
	body: string;
};

export class EmailTemplateProvider {
	buildVerificationTemplate(confirmUrl: string): EmailTemplate {
		const body = [
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

		return {
			subject: "Confirm your Desk Booking account",
			body,
		};
	}

	buildPasswordResetTemplate(resetUrl: string): EmailTemplate {
		const body = [
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

		return {
			subject: "Reset your Desk Booking password",
			body,
		};
	}
}
