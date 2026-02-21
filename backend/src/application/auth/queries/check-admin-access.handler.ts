import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";
import type { CheckAdminAccessQuery } from "@application/auth/queries/check-admin-access.query.js";

type CheckAdminAccessDependencies = {
	userAuthorizationRepo: UserAuthorizationRepository;
};

export class CheckAdminAccessHandler {
	constructor(private readonly deps: CheckAdminAccessDependencies) {}

	async execute(query: CheckAdminAccessQuery): Promise<boolean> {
		return await this.deps.userAuthorizationRepo.isAdminUser(query.userId);
	}
}

