import type { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import type { ConfirmEmailCommand } from "@application/auth/commands/confirm-email.command.js";
import type { RegisterHandler } from "@application/auth/commands/register.handler.js";
import type { RegisterCommand } from "@application/auth/commands/register.command.js";
import { AUTH_REGISTER_RATE_LIMIT } from "@config/constants.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import { applyRateLimit } from "@interfaces/http/rate-limit.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { registerSchema } from "./auth.schemas.js";

export class AuthRegistrationController {
	constructor(
		private readonly registerHandler: RegisterHandler,
		private readonly confirmEmailHandler: ConfirmEmailHandler
	) {}

	async register(req: FastifyRequest, reply: FastifyReply) {
		applyRateLimit(reply, AUTH_REGISTER_RATE_LIMIT);

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
			firstName: parse.data.firstName,
			lastName: parse.data.lastName,
			...(parse.data.secondLastName ? { secondLastName: parse.data.secondLastName } : {}),
		};
		const result = await this.registerHandler.execute(command);

		if (result.status === "DOMAIN_NOT_ALLOWED") {
			throwHttpError(403, "DOMAIN_NOT_ALLOWED", "Email not allowed");
		}

		if (result.status === "INVALID_PROFILE") {
			throwHttpError(400, "INVALID_PROFILE", "Invalid profile fields");
		}

		if (result.status === "ALREADY_CONFIRMED") {
			req.log.info(
				{ event: "auth.register.noop", reason: "already_confirmed" },
				"Registration ignored"
			);
			return reply.send({ ok: true });
		}

		const emailDomain = parse.data.email.split("@")[1]?.toLowerCase() ?? "unknown";
		req.log.info({ event: "auth.register", email_domain: emailDomain }, "Registration requested");
		return reply.send({ ok: true });
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
}

