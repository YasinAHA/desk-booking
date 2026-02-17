import type { ReservationCommandRepository } from "@application/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/ports/reservation-query-repository.js";

export type ReservationDependencies = {
	commandRepo: ReservationCommandRepository;
	queryRepo: ReservationQueryRepository;
};
