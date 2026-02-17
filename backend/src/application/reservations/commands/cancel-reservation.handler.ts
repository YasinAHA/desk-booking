import type { CancelReservationCommand } from "@application/reservations/commands/cancel-reservation.command.js";
import type { ReservationDependencies } from "@application/reservations/types.js";
import { ReservationDateInPastError } from "@domain/reservations/entities/reservation.js";
import {
	InvalidReservationDateError,
	type ReservationDate,
	createReservationDate,
	isReservationDateInPast,
} from "@domain/reservations/value-objects/reservation-date.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type CancelReservationDependencies = Pick<
	ReservationDependencies,
	"commandRepo" | "queryRepo"
>;

export class CancelReservationHandler {
	constructor(private readonly deps: CancelReservationDependencies) {}

	async execute(command: CancelReservationCommand): Promise<boolean> {
		const userIdVO = createUserId(command.userId);
		const reservationIdVO = createReservationId(command.reservationId);

		const found = await this.deps.queryRepo.findActiveByIdForUser(reservationIdVO, userIdVO);

		if (!found?.reservationDate) {
			return false;
		}

		let reservationDate: ReservationDate;
		try {
			reservationDate = createReservationDate(found.reservationDate);
		} catch (err) {
			if (err instanceof InvalidReservationDateError) {
				return false;
			}
			throw err;
		}

		if (isReservationDateInPast(reservationDate)) {
			throw new ReservationDateInPastError();
		}

		return this.deps.commandRepo.cancel(reservationIdVO, userIdVO);
	}
}


