import type { DeskRepository } from "@application/desks/ports/desk-repository.js";
import type { RegenerateDeskQrCommand } from "@application/desks/commands/regenerate-desk-qr.command.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";

type RegenerateDeskQrDependencies = {
	deskRepo: DeskRepository;
};

export class RegenerateDeskQrHandler {
	constructor(private readonly deps: RegenerateDeskQrDependencies) {}

	async execute(command: RegenerateDeskQrCommand): Promise<string | null> {
		const deskId = createDeskId(command.deskId);
		return this.deps.deskRepo.regenerateQrPublicId(deskId);
	}
}
