import type { LogoutHandler } from "@application/auth/commands/logout.handler.js";
import type { RefreshSessionHandler } from "@application/auth/commands/refresh-session.handler.js";
import type { LoginHandler } from "@application/auth/queries/login.handler.js";
import type { LoginQuery } from "@application/auth/queries/login.query.js";
import { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
import type { LoginResult } from "@application/auth/types.js";
import type { VerifyTokenHandler } from "@application/auth/queries/verify-token.handler.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { mapLoginResponse, mapVerifyResponse } from "./auth.mappers.js";
import { loginSchema, verifySchema } from "./auth.schemas.js";

type StatusHttpError = {
	statusCode: number;
	code: string;
	message: string;
};

const LOGIN_STATUS_HTTP_ERRORS: Record<
	Exclude<LoginResult["status"], "OK">,
	StatusHttpError
> = {
	NOT_CONFIRMED: {
		statusCode: 401,
		code: "EMAIL_NOT_CONFIRMED",
		message: "Tu email aun no esta confirmado.",
	},
	INVALID_CREDENTIALS: {
		statusCode: 401,
		code: "INVALID_CREDENTIALS",
		message: "Credenciales invalidas.",
	},
};

export class AuthLoginController {
	constructor(
		private readonly loginHandler: LoginHandler,
		private readonly authSessionLifecycleService: AuthSessionLifecycleService,
		private readonly verifyTokenHandler: VerifyTokenHandler,
		private readonly refreshSessionHandler: RefreshSessionHandler,
		private readonly logoutHandler: LogoutHandler,
	) {}

	async login(req: FastifyRequest, reply: FastifyReply) {
		const parse = loginSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const query: LoginQuery = {
			email: parse.data.email.toLowerCase(),
			password: parse.data.password,
		};
		const result = await this.loginHandler.execute(query);
		if (result.status !== "OK") {
			const error = LOGIN_STATUS_HTTP_ERRORS[result.status];
			throwHttpError(error.statusCode, error.code, error.message);
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
