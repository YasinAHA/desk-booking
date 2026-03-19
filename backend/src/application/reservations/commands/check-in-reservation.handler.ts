import type { ReservationDependencies } from "@application/reservations/types.js";
import type { CheckInReservationCommand } from "@application/reservations/commands/check-in-reservation.command.js";
import type { AuditEventWriter } from "@application/common/ports/audit-event-writer.js";
import {
	createReservationId,
	reservationIdToString,
} from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId, userIdToString } from "@domain/auth/value-objects/user-id.js";
import { deskIdToString } from "@domain/desks/value-objects/desk-id.js";
import { officeIdToString } from "@domain/desks/value-objects/office-id.js";

type CheckInReservationDependencies = Pick<
	ReservationDependencies,
	"commandRepo" | "queryRepo"
> & {
	auditWriter: AuditEventWriter;
};

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

		const status = await this.deps.commandRepo.checkInReservation(reservationId);
		if (status === "checked_in") {
			await this.deps.auditWriter.append({
				eventType: "reservation_checked_in",
				actorType: "user",
				actorUserId: userIdToString(userId),
				reservationId: reservationIdToString(found.reservation.id),
				deskId: deskIdToString(found.reservation.deskId),
				officeId: officeIdToString(found.reservation.officeId),
			});
		}
		return status;
	}
}
