import type { DeskRepository } from "@application/desks/ports/desk-repository.js";
import type { RegenerateAllDesksQrCommand } from "@application/desks/commands/regenerate-all-desks-qr.command.js";

type RegenerateAllDesksQrDependencies = {
	deskRepo: DeskRepository;
};

export class RegenerateAllDesksQrHandler {
	constructor(private readonly deps: RegenerateAllDesksQrDependencies) {}

	async execute(_command: RegenerateAllDesksQrCommand): Promise<number> {
		return this.deps.deskRepo.regenerateAllQrPublicIds();
	}
}
