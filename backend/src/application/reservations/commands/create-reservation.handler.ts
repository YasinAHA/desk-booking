import type { CreateReservationCommand } from "@application/reservations/commands/create-reservation.command.js";
import type { ReservationDependencies } from "@application/reservations/handlers/reservation.types.js";
import {
	ReservationDateInPastError,
	type ReservationSource,
} from "@domain/reservations/entities/reservation.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import {
	InvalidReservationDateError,
	type ReservationDate,
	createReservationDate,
	isReservationDateInPast,
	reservationDateToString,
} from "@domain/reservations/value-objects/reservation-date.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type CreateReservationDependencies = Pick<ReservationDependencies, "commandRepo">;

export class CreateReservationHandler {
	constructor(private readonly deps: CreateReservationDependencies) {}

	async execute(command: CreateReservationCommand): Promise<string> {
		const userIdVO = createUserId(command.userId);
		const deskIdVO = createDeskId(command.deskId);
		const officeIdVO = command.officeId ? createOfficeId(command.officeId) : null;
		const reservationSource: ReservationSource = command.source ?? "user";

		let reservationDate: ReservationDate;
		try {
			reservationDate = createReservationDate(command.date);
		} catch (err) {
			if (err instanceof InvalidReservationDateError) {
				throw new ReservationDateInPastError();
			}
			throw err;
		}

		if (isReservationDateInPast(reservationDate)) {
			throw new ReservationDateInPastError();
		}

		return this.deps.commandRepo.create(
			userIdVO,
			reservationDateToString(reservationDate),
			deskIdVO,
			reservationSource,
			officeIdVO
		);
	}
}

