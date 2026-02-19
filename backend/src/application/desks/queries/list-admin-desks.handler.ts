import type { DeskRepository } from "@application/desks/ports/desk-repository.js";
import type { ListAdminDesksQuery } from "@application/desks/queries/list-admin-desks.query.js";

type ListAdminDesksDependencies = {
	deskRepo: DeskRepository;
};

export class ListAdminDesksHandler {
	constructor(private readonly deps: ListAdminDesksDependencies) {}

	async execute(_query: ListAdminDesksQuery) {
		return this.deps.deskRepo.listForAdmin();
	}
}
