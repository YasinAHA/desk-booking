import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";
import type { DeskRepository } from "@application/desks/ports/desk-repository.js";
import type { RegenerateAllDesksQrCommand } from "@application/desks/commands/regenerate-all-desks-qr.command.js";
import { AdminAuthorizationError } from "@application/desks/errors/admin-authorization-error.js";

type RegenerateAllDesksQrDependencies = {
	deskRepo: DeskRepository;
	userAuthorizationRepo: UserAuthorizationRepository;
};

export class RegenerateAllDesksQrHandler {
	constructor(private readonly deps: RegenerateAllDesksQrDependencies) {}

	async execute(command: RegenerateAllDesksQrCommand): Promise<number> {
		const isAdmin = await this.deps.userAuthorizationRepo.isAdminUser(command.requestedByUserId);
		if (!isAdmin) {
			throw new AdminAuthorizationError();
		}
		return this.deps.deskRepo.regenerateAllQrPublicIds();
	}
}
