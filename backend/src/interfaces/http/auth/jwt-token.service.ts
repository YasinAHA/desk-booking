import { randomUUID } from "node:crypto";
import type { TokenRevocationRepository } from "@application/ports/token-revocation-repository.js";
import { env } from "@config/env.js";
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
}

export type JwtPayload = AccessTokenPayload | RefreshTokenPayload;

/**
 * JwtTokenService: Encapsulates JWT token creation and verification logic
 * - Decouples HTTP layer from specific JWT implementation via JwtProvider port
 * - Centralizes token payload structure
 * - Handles both access and refresh token lifecycle
 * - Includes expiration and revocation checking
 */
export class JwtTokenService {
	constructor(
		private readonly jwtProvider: JwtProvider,
		private readonly tokenRevocationRepository: TokenRevocationRepository
	) {}

	/**
	 * Create a signed access token from user data
	 * @param payload User data to encode in token
	 * @returns Signed JWT token string
	 */
	createAccessToken(payload: Omit<AccessTokenPayload, "type" | "jti">): string {
		const jti = randomUUID();
		return this.jwtProvider.sign(
			{
				...payload,
				jti,
				type: "access",
			},
			{
				expiresIn: env.JWT_EXPIRATION,
			}
		);
	}

	/**
	 * Create a signed refresh token for user
	 * @param payload User data to encode in token
	 * @returns Signed JWT token string
	 */
	createRefreshToken(
		payload: Omit<RefreshTokenPayload, "type" | "jti">
	): string {
		const jti = randomUUID();
		return this.jwtProvider.sign(
			{
				...payload,
				jti,
				type: "refresh",
			},
			{
				expiresIn: env.JWT_REFRESH_EXPIRATION,
			}
		);
	}

	/**
	 * Verify and decode an access token
	 * @param token JWT token string
	 * @returns Decoded payload if valid and not revoked, throws otherwise
	 */
	async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
		const payload = this.jwtProvider.verify(token);

		if (!payload || typeof payload !== "object") {
			throw new Error("Invalid token");
		}

		const p = payload ;
		if (
			!("id" in p) ||
			!("email" in p) ||
			!("firstName" in p) ||
			!("lastName" in p) ||
			!("secondLastName" in p) ||
			!("jti" in p) ||
			p.type !== "access"
		) {
			throw new Error("Invalid token structure");
		}

		// Check revocation blacklist
		const isRevoked = await this.tokenRevocationRepository.isRevoked(String(p.jti));
		if (isRevoked) {
			throw new Error("Token has been revoked");
		}

		return payload as unknown as AccessTokenPayload;
	}

	/**
	 * Verify and decode a refresh token
	 * @param token JWT token string
	 * @returns Decoded payload if valid and not revoked, throws otherwise
	 */
	async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
		const payload = this.jwtProvider.verify(token);

		if (!payload || typeof payload !== "object") {
			throw new Error("Invalid refresh token");
		}

		const p = payload;
		if (
			!("id" in p) ||
			!("email" in p) ||
			!("firstName" in p) ||
			!("lastName" in p) ||
			!("secondLastName" in p) ||
			!("jti" in p) ||
			p.type !== "refresh"
		) {
			throw new Error("Invalid refresh token structure");
		}

		// Check revocation blacklist
		const isRevoked = await this.tokenRevocationRepository.isRevoked(String(p.jti));
		if (isRevoked) {
			throw new Error("Refresh token has been revoked");
		}

		return payload as unknown as RefreshTokenPayload;
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

	/**
	 * Verify access token (old method name for backward compatibility during transition)
	 * @deprecated Use verifyAccessToken instead
	 */
	verifyToken(token: string): Promise<AccessTokenPayload> {
		return this.verifyAccessToken(token);
	}
}
