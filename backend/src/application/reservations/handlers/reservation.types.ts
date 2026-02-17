import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";

export type ReservationDependencies = {
	commandRepo: ReservationCommandRepository;
	queryRepo: ReservationQueryRepository;
};

