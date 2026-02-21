import { decodeJwt, jwtVerify, SignJWT, type JWTPayload } from "jose";

import type { JwtProvider, SignOptions, VerifyOptions } from "@interfaces/http/auth/ports/jwt-provider.js";

function toSecretKey(secret: string): Uint8Array {
	return new TextEncoder().encode(secret);
}

type TokenType = "access" | "refresh";

function getPayloadType(payload: Record<string, unknown>): TokenType {
	if (payload.type === "access" || payload.type === "refresh") {
		return payload.type;
	}
	throw new Error("Invalid token payload type");
}

function toJwtPayload(payload: Record<string, unknown>): JWTPayload {
	return payload as JWTPayload;
}

export class JoseJwtProvider implements JwtProvider {
	private readonly accessSecret: Uint8Array;
	private readonly refreshSecret: Uint8Array;

	constructor(accessSecret: string, refreshSecret: string) {
		this.accessSecret = toSecretKey(accessSecret);
		this.refreshSecret = toSecretKey(refreshSecret);
	}

	async sign(payload: Record<string, unknown>, options: SignOptions): Promise<string> {
		const type = getPayloadType(payload);
		const key = type === "refresh" ? this.refreshSecret : this.accessSecret;
		const jwt = new SignJWT(toJwtPayload(payload))
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setIssuedAt();

		if (options.issuer) {
			jwt.setIssuer(options.issuer);
		}
		if (options.audience) {
			jwt.setAudience(options.audience);
		}
		if (options.expiresIn !== undefined) {
			jwt.setExpirationTime(options.expiresIn);
		}

		return await jwt.sign(key);
	}

	async verify(token: string, options?: VerifyOptions): Promise<unknown> {
		const payload = decodeJwt(token) as Record<string, unknown>;
		const type = payload.type === "refresh" ? "refresh" : "access";
		let key = type === "refresh" ? this.refreshSecret : this.accessSecret;
		if (options?.secret) {
			key = toSecretKey(options.secret);
		}

		const verifyOptions: { issuer?: string; audience?: string | string[] } = {};
		if (options?.issuer) {
			verifyOptions.issuer = options.issuer;
		}
		if (options?.audience) {
			verifyOptions.audience = options.audience;
		}

		const result = await jwtVerify(token, key, verifyOptions);

		return result.payload as unknown;
	}
}
