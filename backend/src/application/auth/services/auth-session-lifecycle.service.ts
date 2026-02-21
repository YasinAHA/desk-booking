import type {
	AuthSessionTokenService,
	RefreshTokenClaims,
} from "@application/auth/ports/auth-session-token-service.js";
import type { AuthUser } from "@application/auth/types.js";

export type IssuedSessionTokens = {
	accessToken: string;
	refreshToken: string;
	user: AuthUser;
};

export type RotatedSessionTokens = {
	accessToken: string;
	refreshToken: string;
	userId: string;
};

export class AuthSessionLifecycleService {
	constructor(private readonly tokenService: AuthSessionTokenService) {}

	async issueForUser(user: AuthUser): Promise<IssuedSessionTokens> {
		return {
			accessToken: await this.tokenService.createAccessToken(user),
			refreshToken: await this.tokenService.createRefreshToken(user),
			user,
		};
	}

	async verifyAccessToken(token: string): Promise<AuthUser> {
		return this.tokenService.verifyAccessToken(token);
	}

	async rotateRefreshToken(refreshToken: string): Promise<RotatedSessionTokens> {
		const payload = await this.tokenService.verifyRefreshToken(refreshToken);
		await this.revokeUsedRefreshToken(payload);

		const user: AuthUser = {
			id: payload.id,
			email: payload.email,
			firstName: payload.firstName,
			lastName: payload.lastName,
			secondLastName: payload.secondLastName,
		};

		return {
			accessToken: await this.tokenService.createAccessToken(user),
			refreshToken: await this.tokenService.createRefreshToken(user),
			userId: user.id,
		};
	}

	private async revokeUsedRefreshToken(payload: RefreshTokenClaims): Promise<void> {
		await this.tokenService.revoke(
			payload.jti,
			payload.id,
			this.tokenService.getRefreshTokenExpiresAt(payload)
		);
	}
}
