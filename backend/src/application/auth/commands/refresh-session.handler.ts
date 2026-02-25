import type {
	AuthSessionLifecycleService,
	RotatedSessionTokens,
} from "@application/auth/services/auth-session-lifecycle.service.js";

import type { RefreshSessionCommand } from "./refresh-session.command.js";

type RefreshSessionDependencies = {
	authSessionLifecycleService: AuthSessionLifecycleService;
};

export class RefreshSessionHandler {
	constructor(private readonly deps: RefreshSessionDependencies) {}

	async execute(command: RefreshSessionCommand): Promise<RotatedSessionTokens> {
		return this.deps.authSessionLifecycleService.rotateRefreshToken(command.refreshToken);
	}
}
