import type { AuthUser } from "@application/auth/types.js";

export type RefreshTokenClaims = AuthUser & {
	jti: string;
	exp: number;
};

export interface AuthSessionTokenService {
	createAccessToken(user: AuthUser): Promise<string>;
	createRefreshToken(user: AuthUser): Promise<string>;
	verifyAccessToken(token: string): Promise<AuthUser>;
	verifyRefreshToken(token: string): Promise<RefreshTokenClaims>;
	getRefreshTokenExpiresAt(payload: RefreshTokenClaims): Date;
	revoke(jti: string, userId: string, expiresAt: Date): Promise<void>;
}
