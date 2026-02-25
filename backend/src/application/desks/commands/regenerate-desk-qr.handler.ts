import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";
import type { DeskRepository } from "@application/desks/ports/desk-repository.js";
import type { RegenerateDeskQrCommand } from "@application/desks/commands/regenerate-desk-qr.command.js";
import { AdminAuthorizationError } from "@application/desks/errors/admin-authorization-error.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";

type RegenerateDeskQrDependencies = {
	deskRepo: DeskRepository;
	userAuthorizationRepo: UserAuthorizationRepository;
};

export class RegenerateDeskQrHandler {
	constructor(private readonly deps: RegenerateDeskQrDependencies) {}

	async execute(command: RegenerateDeskQrCommand): Promise<string | null> {
		const isAdmin = await this.deps.userAuthorizationRepo.isAdminUser(command.requestedByUserId);
		if (!isAdmin) {
			throw new AdminAuthorizationError();
		}
		const deskId = createDeskId(command.deskId);
		return this.deps.deskRepo.regenerateQrPublicId(deskId);
	}
}
