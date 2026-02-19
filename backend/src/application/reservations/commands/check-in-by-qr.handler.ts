import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { CheckInByQrCommand } from "@application/reservations/commands/check-in-by-qr.command.js";
import {
	createReservationDate,
	reservationDateToString,
} from "@domain/reservations/value-objects/reservation-date.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type CheckInByQrDependencies = {
	commandRepo: ReservationCommandRepository;
};

export class CheckInByQrHandler {
	constructor(private readonly deps: CheckInByQrDependencies) {}

	async execute(
		command: CheckInByQrCommand
	): Promise<"checked_in" | "already_checked_in" | "not_active" | "not_found"> {
		const userId = createUserId(command.userId);
		const date = reservationDateToString(createReservationDate(command.date));
		return this.deps.commandRepo.checkInByQr(userId, date, command.qrPublicId);
	}
}
