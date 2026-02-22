import type { LogoutHandler } from "@application/auth/commands/logout.handler.js";
import type { RefreshSessionHandler } from "@application/auth/commands/refresh-session.handler.js";
import type { LoginHandler } from "@application/auth/queries/login.handler.js";
import type { LoginQuery } from "@application/auth/queries/login.query.js";
import { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
import type { LoginResult } from "@application/auth/types.js";
import type { VerifyTokenHandler } from "@application/auth/queries/verify-token.handler.js";
import { env } from "@config/env.js";
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

const REFRESH_COOKIE_NAME = "deskbooking_refresh_token";
const REFRESH_COOKIE_PATH = "/auth";
const TRUSTED_ORIGINS = new Set(
	[env.FRONTEND_BASE_URL, ...env.CORS_ORIGINS]
		.map(rawValue => {
			try {
				return new URL(rawValue).origin;
			} catch {
				return null;
			}
		})
		.filter((value): value is string => value !== null)
);

function normalizeOrigin(value: string): string | null {
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

function parseCookieHeader(cookieHeader: string | undefined): Map<string, string> {
	if (!cookieHeader) {
		return new Map();
	}

	return cookieHeader
		.split(";")
		.map(part => part.trim())
		.filter(Boolean)
		.reduce((cookies, cookiePart) => {
			const separatorIndex = cookiePart.indexOf("=");
			if (separatorIndex <= 0) {
				return cookies;
			}
			const key = cookiePart.slice(0, separatorIndex).trim();
			const value = cookiePart.slice(separatorIndex + 1).trim();
			if (!key || !value) {
				return cookies;
			}
			cookies.set(key, decodeURIComponent(value));
			return cookies;
		}, new Map<string, string>());
}

function getRefreshTokenFromCookie(req: FastifyRequest): string | null {
	return parseCookieHeader(req.headers.cookie).get(REFRESH_COOKIE_NAME) ?? null;
}

function toSameSiteValue(): "Lax" | "Strict" | "None" {
	if (env.AUTH_REFRESH_COOKIE_SAME_SITE === "strict") {
		return "Strict";
	}
	if (env.AUTH_REFRESH_COOKIE_SAME_SITE === "none") {
		return "None";
	}
	return "Lax";
}

function buildRefreshCookie(token: string, maxAgeSeconds?: number): string {
	const attributes = [
		`${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
		`Path=${REFRESH_COOKIE_PATH}`,
		"HttpOnly",
		`SameSite=${toSameSiteValue()}`,
	];

	if (env.AUTH_REFRESH_COOKIE_SECURE) {
		attributes.push("Secure");
	}
	if (env.AUTH_REFRESH_COOKIE_DOMAIN) {
		attributes.push(`Domain=${env.AUTH_REFRESH_COOKIE_DOMAIN}`);
	}
	if (typeof maxAgeSeconds === "number") {
		attributes.push(`Max-Age=${maxAgeSeconds}`);
	}

	return attributes.join("; ");
}

function ensureTrustedOriginForCookieAuth(req: FastifyRequest): void {
	const originHeader = req.headers.origin;
	if (typeof originHeader === "string" && originHeader.length > 0) {
		const requestOrigin = normalizeOrigin(originHeader);
		if (!requestOrigin || !TRUSTED_ORIGINS.has(requestOrigin)) {
			throwHttpError(403, "FORBIDDEN", "Invalid request origin");
		}
		return;
	}

	const refererHeader = req.headers.referer;
	if (typeof refererHeader === "string" && refererHeader.length > 0) {
		const refererOrigin = normalizeOrigin(refererHeader);
		if (!refererOrigin || !TRUSTED_ORIGINS.has(refererOrigin)) {
			throwHttpError(403, "FORBIDDEN", "Invalid request origin");
		}
	}
}

function clearRefreshTokenCookie(reply: FastifyReply): void {
	reply.header("Set-Cookie", buildRefreshCookie("", 0));
}

function setRefreshTokenCookie(reply: FastifyReply, refreshToken: string): void {
	reply.header("Set-Cookie", buildRefreshCookie(refreshToken));
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
		setRefreshTokenCookie(reply, session.refreshToken);

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
		ensureTrustedOriginForCookieAuth(req);

		const refreshToken = getRefreshTokenFromCookie(req);
		if (!refreshToken) {
			throwHttpError(401, "UNAUTHORIZED", "Missing refresh token cookie");
		}

		try {
			const session = await this.refreshSessionHandler.execute({
				refreshToken,
			});
			req.log.info({ event: "auth.refresh", userId: session.userId }, "Token refreshed");
			setRefreshTokenCookie(reply, session.refreshToken);
			return reply.send({
				accessToken: session.accessToken,
				refreshToken: session.refreshToken,
			});
		} catch {
			clearRefreshTokenCookie(reply);
			throwHttpError(401, "UNAUTHORIZED", "Invalid refresh token");
		}
	}

	async logout(req: FastifyRequest, reply: FastifyReply) {
		ensureTrustedOriginForCookieAuth(req);

		const refreshToken = getRefreshTokenFromCookie(req);
		if (!refreshToken) {
			throwHttpError(401, "UNAUTHORIZED", "Missing refresh token cookie");
		}

		try {
			await this.logoutHandler.execute({
				refreshToken,
				authenticatedUserId: req.user.id,
			});
			clearRefreshTokenCookie(reply);
			return reply.status(204).send();
		} catch {
			clearRefreshTokenCookie(reply);
			throwHttpError(401, "UNAUTHORIZED", "Invalid refresh token");
		}
	}
}
