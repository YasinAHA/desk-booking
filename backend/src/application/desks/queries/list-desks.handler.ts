import type { DeskRepository } from "@application/desks/ports/desk-repository.js";
import type { ListDesksQuery } from "@application/desks/queries/list-desks.query.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type ListDesksDependencies = {
	deskRepo: DeskRepository;
};

export class ListDesksHandler {
	constructor(private readonly deps: ListDesksDependencies) {}

	async execute(query: ListDesksQuery) {
		const userIdVO = createUserId(query.userId);
		return this.deps.deskRepo.listForDate(query.date, userIdVO);
	}
}


