import type { CancelReservationCommand } from "@application/reservations/commands/cancel-reservation.command.js";
import type { ReservationDependencies } from "@application/reservations/types.js";
import {
	ReservationCancellationWindowClosedError,
	ReservationDateInPastError,
} from "@domain/reservations/entities/reservation.js";
import { isSameDayBookingClosed } from "@domain/reservations/policies/reservation-policy.js";
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
> & {
	nowProvider?: () => Date;
};

export class CancelReservationHandler {
	constructor(private readonly deps: CancelReservationDependencies) {}

	async execute(command: CancelReservationCommand): Promise<boolean> {
		const userIdVO = createUserId(command.userId);
		const reservationIdVO = createReservationId(command.reservationId);

		const found = await this.deps.queryRepo.findByIdForUser(reservationIdVO, userIdVO);

		if (!found?.reservation) {
			return false;
		}
		const now = this.deps.nowProvider?.();
		if (
			isSameDayBookingClosed({
				reservationDate: found.reservation.reservationDate,
				timezone: found.timezone,
				checkinAllowedFrom: found.checkinAllowedFrom,
				...(now ? { now } : {}),
			})
		) {
			throw new ReservationCancellationWindowClosedError();
		}

		let reservationDate: ReservationDate;
		try {
			reservationDate = createReservationDate(found.reservation.reservationDate);
		} catch (err) {
			if (err instanceof InvalidReservationDateError) {
				return false;
			}
			throw err;
		}

		if (isReservationDateInPast(reservationDate)) {
			throw new ReservationDateInPastError();
		}

		found.reservation.cancel(new Date().toISOString());
		return this.deps.commandRepo.cancel(reservationIdVO, userIdVO);
	}
}
