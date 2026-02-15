import {
	ReservationDateInPastError,
	type ReservationSource,
} from "../../domain/entities/reservation.js";
import { createDeskId } from "../../domain/valueObjects/deskId.js";
import { createOfficeId } from "../../domain/valueObjects/officeId.js";
import {
	InvalidReservationDateError,
	type ReservationDate,
	createReservationDate,
	isReservationDateInPast,
	reservationDateToString,
} from "../../domain/valueObjects/reservationDate.js";
import { createReservationId } from "../../domain/valueObjects/reservationId.js";
import { createUserId } from "../../domain/valueObjects/userId.js";
import type { ReservationCommandRepository } from "../ports/reservationCommandRepository.js";
import type { ReservationQueryRepository } from "../ports/reservationQueryRepository.js";

export class ReservationUseCase {
	constructor(
		private readonly commandRepo: ReservationCommandRepository,
		private readonly queryRepo: ReservationQueryRepository
	) {}

	async create(
		userId: string,
		date: string,
		deskId: string,
		source?: ReservationSource,
		officeId?: string
	): Promise<string> {
		// Convert string IDs to value objects
		const userIdVO = createUserId(userId);
		const deskIdVO = createDeskId(deskId);
		const officeIdVO = officeId ? createOfficeId(officeId) : null;
		const reservationSource: ReservationSource = source ?? "user";

		// Validate and convert to value object
		let reservationDate: ReservationDate;
		try {
			reservationDate = createReservationDate(date);
		} catch (err) {
			if (err instanceof InvalidReservationDateError) {
				throw new ReservationDateInPastError();
			}
			throw err;
		}

		if (isReservationDateInPast(reservationDate)) {
			throw new ReservationDateInPastError();
		}

		const reservationIdVO = await this.commandRepo.create(
			userIdVO,
			reservationDateToString(reservationDate),
			deskIdVO,
			reservationSource,
			officeIdVO
		);
		// Convert back to string for HTTP layer
		return reservationIdVO;
	}

	async cancel(userId: string, reservationId: string): Promise<boolean> {
		// Convert string IDs to value objects
		const userIdVO = createUserId(userId);
		const reservationIdVO = createReservationId(reservationId);

		const found = await this.queryRepo.findActiveByIdForUser(
			reservationIdVO,
			userIdVO
		);

		if (!found?.reservationDate) {
			return false;
		}

		// Validate date using value object
		let reservationDate: ReservationDate;
		try {
			reservationDate = createReservationDate(found.reservationDate);
		} catch (err) {
			if (err instanceof InvalidReservationDateError) {
				// Invalid date format - treat as invalid reservation
				return false;
			}
			throw err;
		}

		if (isReservationDateInPast(reservationDate)) {
			throw new ReservationDateInPastError();
		}

		return this.commandRepo.cancel(reservationIdVO, userIdVO);
	}

	async listForUser(userId: string) {
		const userIdVO = createUserId(userId);
		return this.queryRepo.listForUser(userIdVO);
	}
}
