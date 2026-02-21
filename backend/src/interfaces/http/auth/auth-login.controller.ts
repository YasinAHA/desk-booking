import type { LogoutHandler } from "@application/auth/commands/logout.handler.js";
import type { RefreshSessionHandler } from "@application/auth/commands/refresh-session.handler.js";
import type { LoginHandler } from "@application/auth/queries/login.handler.js";
import type { LoginQuery } from "@application/auth/queries/login.query.js";
import { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
import type { VerifyTokenHandler } from "@application/auth/queries/verify-token.handler.js";
import {
	AUTH_LOGIN_RATE_LIMIT,
	AUTH_REFRESH_RATE_LIMIT,
	AUTH_VERIFY_RATE_LIMIT,
} from "@config/constants.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { mapLoginResponse, mapVerifyResponse } from "./auth.mappers.js";
import { loginSchema, verifySchema } from "./auth.schemas.js";

function applyRateLimit(
	reply: FastifyReply,
	config: { max: number; timeWindow?: string; timeWindowMs?: number }
): void {
	reply.rateLimit?.(config);
}

export class AuthLoginController {
	constructor(
		private readonly loginHandler: LoginHandler,
		private readonly authSessionLifecycleService: AuthSessionLifecycleService,
		private readonly verifyTokenHandler: VerifyTokenHandler,
		private readonly refreshSessionHandler: RefreshSessionHandler,
		private readonly logoutHandler: LogoutHandler,
	) {}

	async login(req: FastifyRequest, reply: FastifyReply) {
		applyRateLimit(reply, AUTH_LOGIN_RATE_LIMIT);

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

		const session = await this.authSessionLifecycleService.issueForUser(result.user);
		req.log.info({ event: "auth.login", userId: session.user.id }, "Login ok");

		return reply.send(
			mapLoginResponse({
				accessToken: session.accessToken,
				refreshToken: session.refreshToken,
				user: session.user,
			})
		);
	}

	async verify(req: FastifyRequest, reply: FastifyReply) {
		applyRateLimit(reply, AUTH_VERIFY_RATE_LIMIT);
		req.log.info({ event: "auth.verify" }, "Verify request received");

		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			req.log.warn({ event: "auth.verify" }, "Invalid payload");
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const payload = await this.verifyTokenHandler.execute({ token: parse.data.token });
			req.log.info({ event: "auth.verify", userId: payload.id }, "Token verified OK");
			return reply.send(mapVerifyResponse(payload));
		} catch (err) {
			req.log.warn({ event: "auth.verify", error: err }, "Token verification failed");
			throwHttpError(401, "UNAUTHORIZED", "Invalid token");
		}
	}

	async refresh(req: FastifyRequest, reply: FastifyReply) {
		applyRateLimit(reply, AUTH_REFRESH_RATE_LIMIT);

		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const session = await this.refreshSessionHandler.execute({
				refreshToken: parse.data.token,
			});
			req.log.info({ event: "auth.refresh", userId: session.userId }, "Token refreshed");
			return reply.send({
				accessToken: session.accessToken,
				refreshToken: session.refreshToken,
			});
		} catch {
			throwHttpError(401, "UNAUTHORIZED", "Invalid refresh token");
		}
	}

	async logout(req: FastifyRequest, reply: FastifyReply) {
		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			await this.logoutHandler.execute({
				refreshToken: parse.data.token,
				authenticatedUserId: req.user.id,
			});
			return reply.status(204).send();
		} catch {
			throwHttpError(401, "UNAUTHORIZED", "Invalid refresh token");
		}
	}
}
