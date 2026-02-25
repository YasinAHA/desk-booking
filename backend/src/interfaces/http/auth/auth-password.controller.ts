import type { ChangePasswordCommand } from "@application/auth/commands/change-password.command.js";
import type { ChangePasswordHandler } from "@application/auth/commands/change-password.handler.js";
import type { ForgotPasswordCommand } from "@application/auth/commands/forgot-password.command.js";
import type { ForgotPasswordHandler } from "@application/auth/commands/forgot-password.handler.js";
import type { ResetPasswordCommand } from "@application/auth/commands/reset-password.command.js";
import type { ResetPasswordHandler } from "@application/auth/commands/reset-password.handler.js";
import type {
	ChangePasswordResult,
	ForgotPasswordResult,
	ResetPasswordHandlerResult,
} from "@application/auth/types.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schemas.js";

type StatusHttpError = {
	statusCode: number;
	code: string;
	message: string;
};

const FORGOT_PASSWORD_STATUS_HTTP_ERRORS: Record<
	Exclude<ForgotPasswordResult["status"], "OK">,
	StatusHttpError
> = {
	RATE_LIMITED: {
		statusCode: 429,
		code: "TOO_MANY_REQUESTS",
		message: "Too many requests",
	},
};

const RESET_PASSWORD_STATUS_HTTP_ERRORS: Record<
	Exclude<ResetPasswordHandlerResult["status"], "password_reset">,
	StatusHttpError
> = {
	RATE_LIMITED: {
		statusCode: 429,
		code: "TOO_MANY_REQUESTS",
		message: "Too many requests",
	},
	invalid_token: {
		statusCode: 400,
		code: "INVALID_TOKEN",
		message: "Invalid token",
	},
	expired: {
		statusCode: 400,
		code: "EXPIRED_TOKEN",
		message: "Expired token",
	},
	already_used: {
		statusCode: 409,
		code: "TOKEN_ALREADY_USED",
		message: "Token already used",
	},
};

const CHANGE_PASSWORD_STATUS_HTTP_ERRORS: Record<
	Exclude<ChangePasswordResult["status"], "OK">,
	StatusHttpError
> = {
	INVALID_CREDENTIALS: {
		statusCode: 401,
		code: "INVALID_CREDENTIALS",
		message: "Credenciales invalidas.",
	},
};

export class AuthPasswordController {
	constructor(
		private readonly forgotPasswordHandler: ForgotPasswordHandler,
		private readonly resetPasswordHandler: ResetPasswordHandler,
		private readonly changePasswordHandler: ChangePasswordHandler
	) {}

	async forgotPassword(req: FastifyRequest, reply: FastifyReply) {
		const parse = forgotPasswordSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const command: ForgotPasswordCommand = {
			email: parse.data.email.toLowerCase(),
		};
		const result = await this.forgotPasswordHandler.execute(command);
		if (result.status !== "OK") {
			req.log.warn(
				{
					event: "security.password_reset_requested",
					reason: "identifier_rate_limited",
					email_hash: result.emailHash,
				},
				"Password reset request rate-limited by identifier"
			);
			const error = FORGOT_PASSWORD_STATUS_HTTP_ERRORS[result.status];
			throwHttpError(error.statusCode, error.code, error.message);
		}

		req.log.info(
			{ event: "security.password_reset_requested", email_hash: result.emailHash },
			"Password reset request processed"
		);
		return reply.send({ ok: true });
	}

	async resetPassword(req: FastifyRequest, reply: FastifyReply) {
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
		const result = await this.resetPasswordHandler.execute(command);
		if (result.status !== "password_reset") {
			req.log.warn(
				{
					event: "security.password_reset_failed",
					reason: result.status,
					token_hash: result.tokenHash,
				},
				"Password reset failed"
			);
			const error = RESET_PASSWORD_STATUS_HTTP_ERRORS[result.status];
			throwHttpError(error.statusCode, error.code, error.message);
		}

		req.log.info(
			{ event: "security.password_reset_completed", token_hash: result.tokenHash },
			"Password reset completed"
		);
		return reply.send({ ok: true });
	}

	async changePassword(req: FastifyRequest, reply: FastifyReply) {
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
			const error = CHANGE_PASSWORD_STATUS_HTTP_ERRORS[result.status];
			throwHttpError(error.statusCode, error.code, error.message);
		}

		req.log.info(
			{ event: "security.change_password_completed", userId: command.userId },
			"Password changed successfully"
		);
		return reply.send({ ok: true });
	}
}
