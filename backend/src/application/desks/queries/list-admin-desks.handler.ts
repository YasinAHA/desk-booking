import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";
import type { DeskRepository } from "@application/desks/ports/desk-repository.js";
import type { ListAdminDesksQuery } from "@application/desks/queries/list-admin-desks.query.js";
import { AdminAuthorizationError } from "@application/desks/errors/admin-authorization-error.js";

type ListAdminDesksDependencies = {
	deskRepo: DeskRepository;
	userAuthorizationRepo: UserAuthorizationRepository;
};

export class ListAdminDesksHandler {
	constructor(private readonly deps: ListAdminDesksDependencies) {}

	async execute(query: ListAdminDesksQuery) {
		const isAdmin = await this.deps.userAuthorizationRepo.isAdminUser(query.requestedByUserId);
		if (!isAdmin) {
			throw new AdminAuthorizationError();
		}
		return this.deps.deskRepo.listForAdmin();
	}
}
