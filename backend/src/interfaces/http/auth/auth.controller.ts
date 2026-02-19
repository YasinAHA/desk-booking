import type { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import type { ConfirmEmailCommand } from "@application/auth/commands/confirm-email.command.js";
import type { ForgotPasswordHandler } from "@application/auth/commands/forgot-password.handler.js";
import type { ForgotPasswordCommand } from "@application/auth/commands/forgot-password.command.js";
import type { RegisterHandler } from "@application/auth/commands/register.handler.js";
import type { RegisterCommand } from "@application/auth/commands/register.command.js";
import type { ResetPasswordHandler } from "@application/auth/commands/reset-password.handler.js";
import type { ResetPasswordCommand } from "@application/auth/commands/reset-password.command.js";
import type { ChangePasswordHandler } from "@application/auth/commands/change-password.handler.js";
import type { ChangePasswordCommand } from "@application/auth/commands/change-password.command.js";
import type { LoginHandler } from "@application/auth/queries/login.handler.js";
import type { LoginQuery } from "@application/auth/queries/login.query.js";
import { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
import {
	AUTH_CHANGE_PASSWORD_RATE_LIMIT,
	AUTH_FORGOT_PASSWORD_RATE_LIMIT,
	AUTH_FORGOT_PASSWORD_IDENTIFIER_RATE_LIMIT,
	AUTH_LOGIN_RATE_LIMIT,
	AUTH_RESET_PASSWORD_RATE_LIMIT,
	AUTH_RESET_PASSWORD_IDENTIFIER_RATE_LIMIT,
	AUTH_REFRESH_RATE_LIMIT,
	AUTH_REGISTER_RATE_LIMIT,
	AUTH_VERIFY_RATE_LIMIT,
} from "@config/constants.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash } from "node:crypto";

import { mapLoginResponse, mapVerifyResponse } from "./auth.mappers.js";
import { RecoveryRateLimiter } from "./recovery-rate-limiter.js";
import {
	changePasswordSchema,
	forgotPasswordSchema,
	loginSchema,
	registerSchema,
	resetPasswordSchema,
	verifySchema,
} from "./auth.schemas.js";

const forgotPasswordIdentifierLimiter = new RecoveryRateLimiter(
	AUTH_FORGOT_PASSWORD_IDENTIFIER_RATE_LIMIT.max,
	AUTH_FORGOT_PASSWORD_IDENTIFIER_RATE_LIMIT.timeWindowMs
);
const resetPasswordIdentifierLimiter = new RecoveryRateLimiter(
	AUTH_RESET_PASSWORD_IDENTIFIER_RATE_LIMIT.max,
	AUTH_RESET_PASSWORD_IDENTIFIER_RATE_LIMIT.timeWindowMs
);

function hashSensitive(value: string): string {
	return createHash("sha256")
		.update(value)
		.digest("hex");
}

export class AuthController {
	constructor(
		private readonly loginHandler: LoginHandler,
		private readonly registerHandler: RegisterHandler,
		private readonly confirmEmailHandler: ConfirmEmailHandler,
		private readonly forgotPasswordHandler: ForgotPasswordHandler,
		private readonly resetPasswordHandler: ResetPasswordHandler,
		private readonly changePasswordHandler: ChangePasswordHandler,
		private readonly authSessionLifecycleService: AuthSessionLifecycleService
	) {}

	async login(req: FastifyRequest, reply: FastifyReply) {
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_LOGIN_RATE_LIMIT);
		}

		const parse = loginSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const query: LoginQuery = {
			email: parse.data.email.toLowerCase(),
			password: parse.data.password,
		};
		const result = await this.loginHandler.execute(query);

		if (result.status === "NOT_CONFIRMED") {
			throwHttpError(401, "EMAIL_NOT_CONFIRMED", "Tu email aun no esta confirmado.");
		}
		if (result.status !== "OK") {
			throwHttpError(401, "INVALID_CREDENTIALS", "Credenciales invalidas.");
		}

			const session = this.authSessionLifecycleService.issueForUser(result.user);

			req.log.info({ event: "auth.login", userId: session.user.id }, "Login ok");

			return reply.send(
				mapLoginResponse({
					accessToken: session.accessToken,
					refreshToken: session.refreshToken,
					user: session.user,
				})
			);
	}

	async register(req: FastifyRequest, reply: FastifyReply) {
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_REGISTER_RATE_LIMIT);
		}

		const parse = registerSchema.safeParse(req.body);
		if (!parse.success) {
			const passwordError = parse.error.issues.find(issue => issue.path.includes("password"));
			if (passwordError) {
				throwHttpError(400, "WEAK_PASSWORD", passwordError.message);
			}
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const command: RegisterCommand = {
			email: parse.data.email.toLowerCase(),
			password: parse.data.password,
			firstName: parse.data.first_name,
			lastName: parse.data.last_name,
			...(parse.data.second_last_name
				? { secondLastName: parse.data.second_last_name }
				: {}),
		};
		const result = await this.registerHandler.execute(command);

		if (result.status === "DOMAIN_NOT_ALLOWED") {
			throwHttpError(403, "DOMAIN_NOT_ALLOWED", "Email not allowed");
		}

		if (result.status === "ALREADY_CONFIRMED") {
			req.log.info(
				{ event: "auth.register.noop", reason: "already_confirmed" },
				"Registration ignored"
			);
			return reply.send({ ok: true });
		}

		const emailDomain = parse.data.email.split("@")[1]?.toLowerCase() ?? "unknown";
		req.log.info(
			{ event: "auth.register", email_domain: emailDomain },
			"Registration requested"
		);

		return reply.send({ ok: true });
	}

	async verify(req: FastifyRequest, reply: FastifyReply) {
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_VERIFY_RATE_LIMIT);
		}

		req.log.info({ event: "auth.verify" }, "Verify request received");

		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			req.log.warn({ event: "auth.verify" }, "Invalid payload");
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const payload = await this.authSessionLifecycleService.verifyAccessToken(parse.data.token);

			req.log.info({ event: "auth.verify", userId: payload.id }, "Token verified OK");
			return reply.send(mapVerifyResponse(payload));
		} catch (err) {
			req.log.warn({ event: "auth.verify", error: err }, "Token verification failed");
			throwHttpError(401, "UNAUTHORIZED", "Invalid token");
		}
	}

	async confirmEmail(req: FastifyRequest, reply: FastifyReply) {
		const token = (req.query as { token?: string }).token;
		if (!token) {
			throwHttpError(400, "BAD_REQUEST", "Missing token");
		}

		const command: ConfirmEmailCommand = { token };
		const result = await this.confirmEmailHandler.execute(command);

		if (result === "invalid_token") {
			throwHttpError(400, "INVALID_TOKEN", "Invalid token");
		}
		if (result === "expired") {
			throwHttpError(400, "EXPIRED_TOKEN", "Expired token");
		}
		if (result === "already_confirmed") {
			throwHttpError(409, "ALREADY_CONFIRMED", "Email already confirmed");
		}

		req.log.info({ event: "auth.confirm" }, "Email confirmed");
		return reply.send({ ok: true });
	}

	async logout(_req: FastifyRequest, reply: FastifyReply) {
		return reply.status(204).send();
	}

	async refresh(req: FastifyRequest, reply: FastifyReply) {
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_REFRESH_RATE_LIMIT);
		}

		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const session = await this.authSessionLifecycleService.rotateRefreshToken(parse.data.token);

			req.log.info({ event: "auth.refresh", userId: session.userId }, "Token refreshed");

			return reply.send({
				accessToken: session.accessToken,
				refreshToken: session.refreshToken,
			});
		} catch {
			throwHttpError(401, "UNAUTHORIZED", "Invalid refresh token");
		}
	}

	async forgotPassword(req: FastifyRequest, reply: FastifyReply) {
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_FORGOT_PASSWORD_RATE_LIMIT);
		}

		const parse = forgotPasswordSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const command: ForgotPasswordCommand = {
			email: parse.data.email.toLowerCase(),
		};
		const emailHash = hashSensitive(command.email);
		const allowed = forgotPasswordIdentifierLimiter.consume(emailHash);
		if (!allowed) {
			req.log.warn(
				{ event: "security.password_reset_requested", reason: "identifier_rate_limited", email_hash: emailHash },
				"Password reset request rate-limited by identifier"
			);
			throwHttpError(429, "TOO_MANY_REQUESTS", "Too many requests");
		}

		await this.forgotPasswordHandler.execute(command);
		req.log.info(
			{ event: "security.password_reset_requested", email_hash: emailHash },
			"Password reset request processed"
		);
		return reply.send({ ok: true });
	}

	async resetPassword(req: FastifyRequest, reply: FastifyReply) {
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_RESET_PASSWORD_RATE_LIMIT);
		}

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
		const tokenHash = hashSensitive(command.token);
		const allowed = resetPasswordIdentifierLimiter.consume(tokenHash);
		if (!allowed) {
			req.log.warn(
				{ event: "security.password_reset_failed", reason: "identifier_rate_limited", token_hash: tokenHash },
				"Password reset attempt rate-limited by token"
			);
			throwHttpError(429, "TOO_MANY_REQUESTS", "Too many requests");
		}

		const result = await this.resetPasswordHandler.execute(command);

		if (result === "invalid_token") {
			req.log.warn(
				{ event: "security.password_reset_failed", reason: "invalid_token", token_hash: tokenHash },
				"Password reset failed: invalid token"
			);
			throwHttpError(400, "INVALID_TOKEN", "Invalid token");
		}
		if (result === "expired") {
			req.log.warn(
				{ event: "security.password_reset_failed", reason: "expired_token", token_hash: tokenHash },
				"Password reset failed: expired token"
			);
			throwHttpError(400, "EXPIRED_TOKEN", "Expired token");
		}
		if (result === "already_used") {
			req.log.warn(
				{ event: "security.password_reset_failed", reason: "already_used", token_hash: tokenHash },
				"Password reset failed: token already used"
			);
			throwHttpError(409, "TOKEN_ALREADY_USED", "Token already used");
		}

		req.log.info(
			{ event: "security.password_reset_completed", token_hash: tokenHash },
			"Password reset completed"
		);
		return reply.send({ ok: true });
	}

	async changePassword(req: FastifyRequest, reply: FastifyReply) {
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_CHANGE_PASSWORD_RATE_LIMIT);
		}

		const parse = changePasswordSchema.safeParse(req.body);
		if (!parse.success) {
			const passwordError = parse.error.issues.find(issue => issue.path.includes("new_password"));
			if (passwordError) {
				throwHttpError(400, "WEAK_PASSWORD", passwordError.message);
			}
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const command: ChangePasswordCommand = {
			userId: req.user.id,
			currentPassword: parse.data.current_password,
			newPassword: parse.data.new_password,
		};
		const result = await this.changePasswordHandler.execute(command);
		if (result.status !== "OK") {
			req.log.warn(
				{ event: "security.change_password_failed", userId: command.userId, reason: "invalid_credentials" },
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
