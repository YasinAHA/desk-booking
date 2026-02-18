import type { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import type { ConfirmEmailCommand } from "@application/auth/commands/confirm-email.command.js";
import type { RegisterHandler } from "@application/auth/commands/register.handler.js";
import type { RegisterCommand } from "@application/auth/commands/register.command.js";
import type { LoginHandler } from "@application/auth/queries/login.handler.js";
import type { LoginQuery } from "@application/auth/queries/login.query.js";
import {
	AUTH_LOGIN_RATE_LIMIT,
	AUTH_REGISTER_RATE_LIMIT,
	AUTH_VERIFY_RATE_LIMIT,
} from "@config/constants.js";
import { JwtTokenService } from "@interfaces/http/auth/jwt-token.service.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { mapLoginResponse, mapVerifyResponse } from "./auth.mappers.js";
import { loginSchema, registerSchema, verifySchema } from "./auth.schemas.js";

export class AuthController {
	constructor(
		private readonly loginHandler: LoginHandler,
		private readonly registerHandler: RegisterHandler,
		private readonly confirmEmailHandler: ConfirmEmailHandler,
		private readonly jwtTokenService: JwtTokenService
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

		const user = result.user;
		const accessToken = this.jwtTokenService.createAccessToken({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			secondLastName: user.secondLastName,
		});
		const refreshToken = this.jwtTokenService.createRefreshToken({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			secondLastName: user.secondLastName,
		});

		req.log.info({ event: "auth.login", userId: user.id }, "Login ok");

		return reply.send(
			mapLoginResponse({
				accessToken,
				refreshToken,
				user,
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

		req.log.info({ event: "auth.verify", body: req.body }, "Verify request received");

		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			req.log.warn({ event: "auth.verify", body: req.body }, "Invalid payload");
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const payload = await this.jwtTokenService.verifyAccessToken(parse.data.token);

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
			reply.rateLimit(AUTH_LOGIN_RATE_LIMIT);
		}

		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const refreshPayload = await this.jwtTokenService.verifyRefreshToken(parse.data.token);

			const accessToken = this.jwtTokenService.createAccessToken({
				id: refreshPayload.id,
				email: refreshPayload.email,
				firstName: refreshPayload.firstName,
				lastName: refreshPayload.lastName,
				secondLastName: refreshPayload.secondLastName,
			});

			req.log.info({ event: "auth.refresh", userId: refreshPayload.id }, "Token refreshed");

			return reply.send({
				accessToken,
				refreshToken: parse.data.token,
			});
		} catch {
			throwHttpError(401, "UNAUTHORIZED", "Invalid refresh token");
		}
	}
}
