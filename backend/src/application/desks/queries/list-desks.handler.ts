import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import type { DeskRepository, ListDesksFilters } from "@application/desks/ports/desk-repository.js";
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
		const filters: ListDesksFilters = {};
		if (query.officeId !== undefined) {
			filters.officeId = query.officeId;
		}
		if (query.zoneId !== undefined) {
			filters.zoneId = query.zoneId;
		}
		if (query.status !== undefined) {
			filters.status = query.status;
		}
		return this.deps.deskRepo.listForDate(query.date, userIdVO, filters);
	}
}
