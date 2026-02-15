import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthUseCase } from "../../../application/usecases/auth.usecase.js";
import {
	AUTH_LOGIN_RATE_LIMIT,
	AUTH_REGISTER_RATE_LIMIT,
	AUTH_VERIFY_RATE_LIMIT,
} from "../../../config/constants.js";
import { validatePasswordPolicy } from "../../../domain/valueObjects/password-policy.js";
import { throwHttpError } from "../http-errors.js";
import { JwtTokenService } from "./jwt-token.service.js";

/**
 * Schemas for auth request validation
 */
const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const verifySchema = z.object({
	token: z.string().min(1),
});

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).refine(
		(pwd) => {
			try {
				validatePasswordPolicy(pwd);
				return true;
			} catch {
				return false;
			}
		},
		"Password must be at least 12 characters with uppercase, lowercase, digit, and special char"
	),
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	second_last_name: z.string().min(1).optional(),
});

/**
 * AuthController: Handles HTTP layer concerns for authentication
 * - Request validation
 * - Response mapping
 * - Rate limiting
 * - Error handling
 * - JWT token creation and verification
 */
export class AuthController {
	constructor(
		private readonly authUseCase: AuthUseCase,
		private readonly jwtTokenService: JwtTokenService
	) {}

	async login(req: FastifyRequest, reply: FastifyReply) {
		// Rate limiting
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_LOGIN_RATE_LIMIT);
		}

		// Validation
		const parse = loginSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		// Application logic
		const result = await this.authUseCase.login(
			parse.data.email.toLowerCase(),
			parse.data.password
		);

		// Error mapping
		if (result.status === "NOT_CONFIRMED") {
			throwHttpError(401, "EMAIL_NOT_CONFIRMED", "Tu email aun no esta confirmado.");
		}
		if (result.status !== "OK") {
			throwHttpError(401, "INVALID_CREDENTIALS", "Credenciales invalidas.");
		}

		// Response mapping
		const user = result.user;
		const accessToken = this.jwtTokenService.createAccessToken({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			secondLastName: user.secondLastName,
		});
		const refreshToken = this.jwtTokenService.createRefreshToken(user.id);

		req.log.info({ event: "auth.login", userId: user.id }, "Login ok");

		return reply.send({
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				email: user.email,
				first_name: user.firstName,
				last_name: user.lastName,
				second_last_name: user.secondLastName,
			},
		});
	}

	async register(req: FastifyRequest, reply: FastifyReply) {
		// Rate limiting
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_REGISTER_RATE_LIMIT);
		}

		// Validation
		const parse = registerSchema.safeParse(req.body);
		if (!parse.success) {
			// Check if it's a password validation error (more granular error message)
			const passwordError = parse.error.issues.find(issue => issue.path.includes("password"));
			if (passwordError) {
				throwHttpError(400, "WEAK_PASSWORD", passwordError.message);
			}
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		// Application logic
		const result = await this.authUseCase.register(
			parse.data.email.toLowerCase(),
			parse.data.password,
			parse.data.first_name,
			parse.data.last_name,
			parse.data.second_last_name
		);

		// Error mapping
		if (result.status === "DOMAIN_NOT_ALLOWED") {
			throwHttpError(403, "DOMAIN_NOT_ALLOWED", "Email not allowed");
		}

		// Response mapping
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
		// Rate limiting
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_VERIFY_RATE_LIMIT);
		}

		// Validation
		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		// Application logic & error handling
		try {
			const payload = await this.jwtTokenService.verifyAccessToken(parse.data.token);

			// Response mapping
			return reply.send({
				valid: true,
				user: {
					id: payload.id,
					email: payload.email,
					first_name: payload.firstName,
					last_name: payload.lastName,
					second_last_name: payload.secondLastName,
				},
			});
		} catch {
			throwHttpError(401, "UNAUTHORIZED", "Invalid token");
		}
	}

	async confirmEmail(req: FastifyRequest, reply: FastifyReply) {
		// Validation
		const token = (req.query as { token?: string }).token;
		if (!token) {
			throwHttpError(400, "BAD_REQUEST", "Missing token");
		}

		// Application logic
		const ok = await this.authUseCase.confirmEmail(token);

		// Error mapping
		if (!ok) {
			throwHttpError(400, "INVALID_TOKEN", "Invalid or expired token");
		}

		// Response mapping
		req.log.info({ event: "auth.confirm" }, "Email confirmed");
		return reply.send({ ok: true });
	}

	async logout(_req: FastifyRequest, reply: FastifyReply) {
		return reply.status(204).send();
	}

	async refresh(req: FastifyRequest, reply: FastifyReply) {
		// Rate limiting
		if (reply.rateLimit) {
			reply.rateLimit(AUTH_LOGIN_RATE_LIMIT);
		}

		// Validation
		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		// Application logic & error handling
		try {
			const refreshPayload = await this.jwtTokenService.verifyRefreshToken(parse.data.token);

			// Get user data (would need user repo in real scenario)
			// For now, we'll create a new access token with minimal info
			// In production, fetch user from DB to ensure it still exists and isn't deactivated
			const accessToken = this.jwtTokenService.createAccessToken({
				id: refreshPayload.id,
				email: "", // Would fetch from DB
				firstName: "", // Would fetch from DB
				lastName: "", // Would fetch from DB
				secondLastName: null,
			});

			req.log.info({ event: "auth.refresh", userId: refreshPayload.id }, "Token refreshed");

			// Response mapping
			return reply.send({
				accessToken,
				refreshToken: parse.data.token, // Refresh token unchanged
			});
		} catch {
			throwHttpError(401, "UNAUTHORIZED", "Invalid refresh token");
		}
	}
}
