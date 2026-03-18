import type { ReservationDependencies } from "@application/reservations/types.js";
import type { CheckInReservationCommand } from "@application/reservations/commands/check-in-reservation.command.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type CheckInReservationDependencies = Pick<
	ReservationDependencies,
	"commandRepo" | "queryRepo"
>;

export class CheckInReservationHandler {
	constructor(private readonly deps: CheckInReservationDependencies) {}

	async execute(
		command: CheckInReservationCommand
	): Promise<"checked_in" | "already_checked_in" | "not_active" | "not_found"> {
		const userId = createUserId(command.userId);
		const reservationId = createReservationId(command.reservationId);

		const found = await this.deps.queryRepo.findByIdForUser(reservationId, userId);
		if (!found) {
			return "not_found";
		}

		return this.deps.commandRepo.checkInReservation(reservationId);
	}
}

