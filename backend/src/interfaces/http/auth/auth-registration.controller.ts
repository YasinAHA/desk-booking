import type { ConfirmEmailCommand } from "@application/auth/commands/confirm-email.command.js";
import type { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import type { RegisterCommand } from "@application/auth/commands/register.command.js";
import type { RegisterHandler } from "@application/auth/commands/register.handler.js";
import type { ConfirmEmailResult } from "@application/auth/ports/email-verification-repository.js";
import type { RegisterResult } from "@application/auth/types.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { registerSchema } from "./auth.schemas.js";

type StatusHttpError = {
	statusCode: number;
	code: string;
	message: string;
};

const REGISTER_STATUS_HTTP_ERRORS: Record<
	Exclude<RegisterResult["status"], "OK" | "ALREADY_CONFIRMED">,
	StatusHttpError
> = {
	DOMAIN_NOT_ALLOWED: {
		statusCode: 403,
		code: "DOMAIN_NOT_ALLOWED",
		message: "Email not allowed",
	},
	INVALID_PROFILE: {
		statusCode: 400,
		code: "INVALID_PROFILE",
		message: "Invalid profile fields",
	},
};

const CONFIRM_EMAIL_STATUS_HTTP_ERRORS: Record<
	Exclude<ConfirmEmailResult, "confirmed">,
	StatusHttpError
> = {
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
	already_confirmed: {
		statusCode: 409,
		code: "ALREADY_CONFIRMED",
		message: "Email already confirmed",
	},
};

export class AuthRegistrationController {
	constructor(
		private readonly registerHandler: RegisterHandler,
		private readonly confirmEmailHandler: ConfirmEmailHandler
	) {}

	async register(req: FastifyRequest, reply: FastifyReply) {
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

		if (result.status === "ALREADY_CONFIRMED") {
			req.log.info(
				{ event: "auth.register.noop", reason: "already_confirmed" },
				"Registration ignored"
			);
			return reply.send({ ok: true });
		}

		if (result.status !== "OK") {
			const error = REGISTER_STATUS_HTTP_ERRORS[result.status];
			throwHttpError(error.statusCode, error.code, error.message);
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
		if (result !== "confirmed") {
			const error = CONFIRM_EMAIL_STATUS_HTTP_ERRORS[result];
			throwHttpError(error.statusCode, error.code, error.message);
		}

		req.log.info({ event: "auth.confirm" }, "Email confirmed");
		return reply.send({ ok: true });
	}
}
