import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import type { DeskRepository } from "@application/desks/ports/desk-repository.js";
import type { ListDesksQuery } from "@application/desks/queries/list-desks.query.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type ListDesksDependencies = {
	deskRepo: DeskRepository;
	noShowPolicyService: NoShowPolicyService;
};

export class ListDesksHandler {
	constructor(private readonly deps: ListDesksDependencies) {}

	async execute(query: ListDesksQuery) {
		const userIdVO = createUserId(query.userId);
		await this.deps.noShowPolicyService.markNoShowExpiredForDate(query.date);
		return this.deps.deskRepo.listForDate(query.date, userIdVO);
	}
}
