import type { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
import type { AuthUser } from "@application/auth/types.js";

import type { VerifyTokenQuery } from "./verify-token.query.js";

type VerifyTokenDependencies = {
	authSessionLifecycleService: AuthSessionLifecycleService;
};

export class VerifyTokenHandler {
	constructor(private readonly deps: VerifyTokenDependencies) {}

	async execute(query: VerifyTokenQuery): Promise<AuthUser> {
		return this.deps.authSessionLifecycleService.verifyAccessToken(query.token);
	}
}

