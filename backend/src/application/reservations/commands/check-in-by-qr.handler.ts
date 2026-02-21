import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
import type { CheckInByQrCommand } from "@application/reservations/commands/check-in-by-qr.command.js";
import { evaluateQrCheckInPolicy } from "@domain/reservations/policies/reservation-policy.js";
import {
	createReservationDate,
	reservationDateToString,
} from "@domain/reservations/value-objects/reservation-date.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type CheckInByQrDependencies = {
	commandRepo: ReservationCommandRepository;
	queryRepo: ReservationQueryRepository;
	noShowPolicyService: NoShowPolicyService;
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

		const checkInDecision = evaluateQrCheckInPolicy({
			status: candidate.status,
			reservationDate: candidate.reservationDate,
			timezone: candidate.timezone,
			checkinAllowedFrom: candidate.checkinAllowedFrom,
			checkinCutoffTime: candidate.checkinCutoffTime,
		});
		if (checkInDecision === "already_checked_in") {
			return "already_checked_in";
		}
		if (checkInDecision === "not_active") {
			return "not_active";
		}

		return this.deps.commandRepo.checkInReservation(candidate.id);
	}
}
