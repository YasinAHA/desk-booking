import { randomUUID } from "node:crypto";
import type { AuthSessionTokenService } from "@application/auth/ports/auth-session-token-service.js";
import type { TokenRevocationRepository } from "@application/auth/ports/token-revocation-repository.js";
import type { UserSessionRepository } from "@application/auth/ports/user-session-repository.js";
import { JwtProvider } from "./ports/jwt-provider.js";

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

export class InvalidTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidTokenError";
	}
}

export class RevokedTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RevokedTokenError";
	}
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

/**
 * JwtTokenService: Encapsulates JWT token creation and verification logic
 * - Decouples HTTP layer from specific JWT implementation via JwtProvider port
 * - Centralizes token payload structure
 * - Handles both access and refresh token lifecycle
 * - Includes expiration and revocation checking
 */
export class JwtTokenService implements AuthSessionTokenService {
	constructor(
		private readonly jwtProvider: JwtProvider,
		private readonly tokenRevocationRepository: TokenRevocationRepository,
		private readonly userSessionRepository: UserSessionRepository,
		private readonly ttlConfig: JwtTokenTtlConfig
	) {}

	/**
	 * Create a signed access token from user data
	 * @param payload User data to encode in token
	 * @returns Signed JWT token string
	 */
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

	/**
	 * Create a signed refresh token for user
	 * @param payload User data to encode in token
	 * @returns Signed JWT token string
	 */
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

	/**
	 * Verify and decode an access token
	 * @param token JWT token string
	 * @returns Decoded payload if valid and not revoked, throws otherwise
	 */
	async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
		const payload = await this.jwtProvider.verify(token);

		if (!isAccessTokenPayload(payload)) {
			throw new InvalidTokenError("Invalid token structure");
		}

		// Check revocation blacklist
		const isRevoked = await this.tokenRevocationRepository.isRevoked(payload.jti);
		if (isRevoked) {
			throw new RevokedTokenError("Token has been revoked");
		}

		await this.assertIssuedAfterTokenValidAfter(payload.id, payload.iat);
		return payload;
	}

	/**
	 * Verify and decode a refresh token
	 * @param token JWT token string
	 * @returns Decoded payload if valid and not revoked, throws otherwise
	 */
	async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
		const payload = await this.jwtProvider.verify(token);

		if (!isRefreshTokenPayload(payload)) {
			throw new InvalidTokenError("Invalid refresh token structure");
		}

		// Check revocation blacklist
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
	/**
	 * Revoke a token by adding its JTI to the blacklist
	 * @param jti JWT ID to revoke
	 * @param userId User ID who owned the token
	 * @param expiresAt Token expiration date
	 */
	async revoke(jti: string, userId: string, expiresAt: Date): Promise<void> {
		await this.tokenRevocationRepository.revoke(jti, userId, expiresAt);
	}

}
