import type { AuditEventWriter } from "@application/common/ports/audit-event-writer.js";
import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import type { CheckInByQrCommand } from "@application/reservations/commands/check-in-by-qr.command.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
import { createUserId, userIdToString } from "@domain/auth/value-objects/user-id.js";
import { deskIdToString } from "@domain/desks/value-objects/desk-id.js";
import { officeIdToString } from "@domain/desks/value-objects/office-id.js";
import {
	createReservationDate,
	reservationDateToString,
} from "@domain/reservations/value-objects/reservation-date.js";
import { reservationIdToString } from "@domain/reservations/value-objects/reservation-id.js";

type CheckInByQrDependencies = {
	commandRepo: ReservationCommandRepository;
	queryRepo: ReservationQueryRepository;
	noShowPolicyService: NoShowPolicyService;
	auditWriter: AuditEventWriter;
};

export class CheckInByQrHandler {
	constructor(private readonly deps: CheckInByQrDependencies) {}

	async execute(
		command: CheckInByQrCommand
	): Promise<"checked_in" | "already_checked_in" | "not_active" | "not_found"> {
		const userId = createUserId(command.userId);
		const date = reservationDateToString(createReservationDate(command.date));
		await this.deps.noShowPolicyService.markNoShowExpiredForDate(date);

		const candidate = await this.deps.queryRepo.findQrCheckInCandidate(
			userId,
			date,
			command.qrPublicId
		);
		if (!candidate) {
			return "not_found";
		}

		if (candidate.reservation.status === "checked_in") {
			return "already_checked_in";
		}
		if (candidate.reservation.status !== "reserved") {
			return "not_active";
		}

		const status = await this.deps.commandRepo.checkInReservation(
			candidate.reservation.id
		);
		if (status === "checked_in") {
			await this.deps.auditWriter.append({
				eventType: "reservation_checked_in",
				actorType: "user",
				actorUserId: userIdToString(userId),
				reservationId: reservationIdToString(candidate.reservation.id),
				deskId: deskIdToString(candidate.reservation.deskId),
				officeId: officeIdToString(candidate.reservation.officeId),
				metadata: { method: "qr" },
			});
		}

		return status;
	}
}