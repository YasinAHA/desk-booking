import { randomUUID } from "node:crypto";
import { InvalidTokenError, RevokedTokenError } from "@application/auth/errors/token-errors.js";
import type { AuthSessionTokenService } from "@application/auth/ports/auth-session-token-service.js";
import type { TokenRevocationRepository } from "@application/auth/ports/token-revocation-repository.js";
import type { UserSessionRepository } from "@application/auth/ports/user-session-repository.js";
import { JwtProvider } from "@infrastructure/auth/security/jwt-provider.js";

/**
 * JWT payload structure for access tokens
 */
export interface AccessTokenPayload {
	jti: string;
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	secondLastName: string | null;
	type: "access";
	iat: number;
}

/**
 * JWT payload structure for refresh tokens
 */
export interface RefreshTokenPayload {
	jti: string;
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	secondLastName: string | null;
	type: "refresh";
	iat: number;
	exp: number;
}

export type JwtPayload = AccessTokenPayload | RefreshTokenPayload;

export interface JwtTokenTtlConfig {
	accessTokenTtl: string | number;
	refreshTokenTtl: string | number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isStringOrNull(value: unknown): value is string | null {
	return typeof value === "string" || value === null;
}

function isPositiveNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
	if (!isRecord(payload)) {
		return false;
	}

	return (
		typeof payload.id === "string" &&
		typeof payload.email === "string" &&
		typeof payload.firstName === "string" &&
		typeof payload.lastName === "string" &&
		isStringOrNull(payload.secondLastName) &&
		typeof payload.jti === "string" &&
		isPositiveNumber(payload.iat) &&
		payload.type === "access"
	);
}

function isRefreshTokenPayload(payload: unknown): payload is RefreshTokenPayload {
	if (!isRecord(payload)) {
		return false;
	}

	return (
		typeof payload.id === "string" &&
		typeof payload.email === "string" &&
		typeof payload.firstName === "string" &&
		typeof payload.lastName === "string" &&
		isStringOrNull(payload.secondLastName) &&
		typeof payload.jti === "string" &&
		isPositiveNumber(payload.iat) &&
		isPositiveNumber(payload.exp) &&
		payload.type === "refresh"
	);
}

export class JwtTokenService implements AuthSessionTokenService {
	constructor(
		private readonly jwtProvider: JwtProvider,
		private readonly tokenRevocationRepository: TokenRevocationRepository,
		private readonly userSessionRepository: UserSessionRepository,
		private readonly ttlConfig: JwtTokenTtlConfig
	) {}

	async createAccessToken(payload: Omit<AccessTokenPayload, "type" | "jti" | "iat">): Promise<string> {
		const jti = randomUUID();
		return await this.jwtProvider.sign(
			{
				...payload,
				jti,
				type: "access",
			},
			{
				expiresIn: this.ttlConfig.accessTokenTtl,
			}
		);
	}

	async createRefreshToken(
		payload: Omit<RefreshTokenPayload, "type" | "jti" | "iat" | "exp">
	): Promise<string> {
		const jti = randomUUID();
		return await this.jwtProvider.sign(
			{
				...payload,
				jti,
				type: "refresh",
			},
			{
				expiresIn: this.ttlConfig.refreshTokenTtl,
			}
		);
	}

	async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
		const payload = await this.jwtProvider.verify(token);

		if (!isAccessTokenPayload(payload)) {
			throw new InvalidTokenError("Invalid token structure");
		}

		const isRevoked = await this.tokenRevocationRepository.isRevoked(payload.jti);
		if (isRevoked) {
			throw new RevokedTokenError("Token has been revoked");
		}

		await this.assertIssuedAfterTokenValidAfter(payload.id, payload.iat);
		return payload;
	}

	async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
		const payload = await this.jwtProvider.verify(token);

		if (!isRefreshTokenPayload(payload)) {
			throw new InvalidTokenError("Invalid refresh token structure");
		}

		const isRevoked = await this.tokenRevocationRepository.isRevoked(payload.jti);
		if (isRevoked) {
			throw new RevokedTokenError("Refresh token has been revoked");
		}

		await this.assertIssuedAfterTokenValidAfter(payload.id, payload.iat);
		return payload;
	}

	private async assertIssuedAfterTokenValidAfter(
		userId: string,
		issuedAtSeconds: number
	): Promise<void> {
		const tokenValidAfter = await this.userSessionRepository.getTokenValidAfter(userId);
		if (!tokenValidAfter) {
			return;
		}

		const issuedAtMs = issuedAtSeconds * 1000;
		if (issuedAtMs < tokenValidAfter.getTime()) {
			throw new RevokedTokenError("Token has been invalidated by password change");
		}
	}

	getRefreshTokenExpiresAt(payload: RefreshTokenPayload): Date {
		return new Date(payload.exp * 1000);
	}

	async revoke(jti: string, userId: string, expiresAt: Date): Promise<void> {
		await this.tokenRevocationRepository.revoke(jti, userId, expiresAt);
	}
}
