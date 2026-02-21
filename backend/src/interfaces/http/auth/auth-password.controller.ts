import type { ChangePasswordHandler } from "@application/auth/commands/change-password.handler.js";
import type { ChangePasswordCommand } from "@application/auth/commands/change-password.command.js";
import type { ForgotPasswordHandler } from "@application/auth/commands/forgot-password.handler.js";
import type { ForgotPasswordCommand } from "@application/auth/commands/forgot-password.command.js";
import type { ResetPasswordHandler } from "@application/auth/commands/reset-password.handler.js";
import type { ResetPasswordCommand } from "@application/auth/commands/reset-password.command.js";
import type { RecoveryAttemptPolicyService } from "@application/auth/services/recovery-attempt-policy.service.js";
import {
	AUTH_CHANGE_PASSWORD_RATE_LIMIT,
	AUTH_FORGOT_PASSWORD_RATE_LIMIT,
	AUTH_RESET_PASSWORD_RATE_LIMIT,
} from "@config/constants.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schemas.js";

function applyRateLimit(reply: FastifyReply, config: { max: number; timeWindow?: string; timeWindowMs?: number }): void {
	reply.rateLimit?.(config);
}

export class AuthPasswordController {
	constructor(
		private readonly forgotPasswordHandler: ForgotPasswordHandler,
		private readonly resetPasswordHandler: ResetPasswordHandler,
		private readonly changePasswordHandler: ChangePasswordHandler,
		private readonly recoveryAttemptPolicyService: RecoveryAttemptPolicyService
	) {}

	async forgotPassword(req: FastifyRequest, reply: FastifyReply) {
		applyRateLimit(reply, AUTH_FORGOT_PASSWORD_RATE_LIMIT);

		const parse = forgotPasswordSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const command: ForgotPasswordCommand = {
			email: parse.data.email.toLowerCase(),
		};
		const attempt = this.recoveryAttemptPolicyService.consumeForgotPasswordAttempt(
			command.email
		);
		if (!attempt.allowed) {
			req.log.warn(
				{
					event: "security.password_reset_requested",
					reason: "identifier_rate_limited",
					email_hash: attempt.emailHash,
				},
				"Password reset request rate-limited by identifier"
			);
			throwHttpError(429, "TOO_MANY_REQUESTS", "Too many requests");
		}

		await this.forgotPasswordHandler.execute(command);
		req.log.info(
			{ event: "security.password_reset_requested", email_hash: attempt.emailHash },
			"Password reset request processed"
		);
		return reply.send({ ok: true });
	}

	async resetPassword(req: FastifyRequest, reply: FastifyReply) {
		applyRateLimit(reply, AUTH_RESET_PASSWORD_RATE_LIMIT);

		const parse = resetPasswordSchema.safeParse(req.body);
		if (!parse.success) {
			const passwordError = parse.error.issues.find(issue => issue.path.includes("password"));
			if (passwordError) {
				throwHttpError(400, "WEAK_PASSWORD", passwordError.message);
			}
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const command: ResetPasswordCommand = {
			token: parse.data.token,
			password: parse.data.password,
		};
		const attempt = this.recoveryAttemptPolicyService.consumeResetPasswordAttempt(
			command.token
		);
		if (!attempt.allowed) {
			req.log.warn(
				{
					event: "security.password_reset_failed",
					reason: "identifier_rate_limited",
					token_hash: attempt.tokenHash,
				},
				"Password reset attempt rate-limited by token"
			);
			throwHttpError(429, "TOO_MANY_REQUESTS", "Too many requests");
		}

		const result = await this.resetPasswordHandler.execute(command);

		if (result === "invalid_token") {
			req.log.warn(
				{ event: "security.password_reset_failed", reason: "invalid_token", token_hash: attempt.tokenHash },
				"Password reset failed: invalid token"
			);
			throwHttpError(400, "INVALID_TOKEN", "Invalid token");
		}
		if (result === "expired") {
			req.log.warn(
				{ event: "security.password_reset_failed", reason: "expired_token", token_hash: attempt.tokenHash },
				"Password reset failed: expired token"
			);
			throwHttpError(400, "EXPIRED_TOKEN", "Expired token");
		}
		if (result === "already_used") {
			req.log.warn(
				{ event: "security.password_reset_failed", reason: "already_used", token_hash: attempt.tokenHash },
				"Password reset failed: token already used"
			);
			throwHttpError(409, "TOKEN_ALREADY_USED", "Token already used");
		}

		req.log.info(
			{ event: "security.password_reset_completed", token_hash: attempt.tokenHash },
			"Password reset completed"
		);
		return reply.send({ ok: true });
	}

	async changePassword(req: FastifyRequest, reply: FastifyReply) {
		applyRateLimit(reply, AUTH_CHANGE_PASSWORD_RATE_LIMIT);

		const parse = changePasswordSchema.safeParse(req.body);
		if (!parse.success) {
			const passwordError = parse.error.issues.find(issue => issue.path.includes("newPassword"));
			if (passwordError) {
				throwHttpError(400, "WEAK_PASSWORD", passwordError.message);
			}
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const command: ChangePasswordCommand = {
			userId: req.user.id,
			currentPassword: parse.data.currentPassword,
			newPassword: parse.data.newPassword,
		};
		const result = await this.changePasswordHandler.execute(command);
		if (result.status !== "OK") {
			req.log.warn(
				{
					event: "security.change_password_failed",
					userId: command.userId,
					reason: "invalid_credentials",
				},
				"Change password failed"
			);
			throwHttpError(401, "INVALID_CREDENTIALS", "Credenciales invalidas.");
		}

		req.log.info(
			{ event: "security.change_password_completed", userId: command.userId },
			"Password changed successfully"
		);
		return reply.send({ ok: true });
	}
}
