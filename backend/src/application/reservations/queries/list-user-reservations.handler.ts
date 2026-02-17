import type { ReservationDependencies } from "@application/reservations/types.js";
import type { ListUserReservationsQuery } from "@application/reservations/queries/list-user-reservations.query.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type ListReservationsDependencies = Pick<ReservationDependencies, "queryRepo">;

export class ListUserReservationsHandler {
	constructor(private readonly deps: ListReservationsDependencies) {}

	async execute(query: ListUserReservationsQuery) {
		const userIdVO = createUserId(query.userId);
		return this.deps.queryRepo.listForUser(userIdVO);
	}
}


