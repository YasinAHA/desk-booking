import type { LogoutCommand } from "@application/auth/commands/logout.command.js";
import type { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";

type LogoutDependencies = {
	authSessionLifecycleService: AuthSessionLifecycleService;
};

export class LogoutHandler {
	constructor(private readonly deps: LogoutDependencies) {}

	async execute(command: LogoutCommand): Promise<void> {
		await this.deps.authSessionLifecycleService.logout(
			command.refreshToken,
			command.authenticatedUserId
		);
	}
}
