import type { CreateReservationCommand } from "@application/reservations/commands/create-reservation.command.js";
import type {
	TransactionManager,
	TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
import {
	DeskAlreadyReservedError,
	ReservationDateInvalidError,
	ReservationDateInPastError,
	ReservationOnNonWorkingDayError,
	ReservationSameDayBookingClosedError,
	UserAlreadyHasReservationError,
	type ReservationSource,
} from "@domain/reservations/entities/reservation.js";
import { isWorkingDayReservationDate } from "@domain/reservations/policies/reservation-policy.js";
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

type CreateReservationDependencies = {
	txManager: TransactionManager;
	commandRepoFactory: (tx: TransactionalContext) => ReservationCommandRepository;
	queryRepoFactory: (tx: TransactionalContext) => ReservationQueryRepository;
	noShowPolicyServiceFactory: (tx: TransactionalContext) => NoShowPolicyService;
};

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
				throw new ReservationDateInvalidError();
			}
			throw err;
		}

		if (isReservationDateInPast(reservationDate)) {
			throw new ReservationDateInPastError();
		}

		const reservationDateString = reservationDateToString(reservationDate);
		if (!isWorkingDayReservationDate(reservationDateString)) {
			throw new ReservationOnNonWorkingDayError();
		}

		return this.deps.txManager.runInTransaction(async tx => {
			const queryRepo = this.deps.queryRepoFactory(tx);
			const commandRepo = this.deps.commandRepoFactory(tx);
			const noShowPolicyService = this.deps.noShowPolicyServiceFactory(tx);

			await noShowPolicyService.markNoShowExpiredForDate(reservationDateString);

			const isSameDayBookingClosed = await queryRepo.isSameDayBookingClosedForDesk(
				deskIdVO,
				reservationDateString
			);
			if (isSameDayBookingClosed) {
				throw new ReservationSameDayBookingClosedError();
			}

			// Deterministic UX: check desk conflict first, then user/day conflict.
			const deskAlreadyReserved = await queryRepo.hasActiveReservationForDeskOnDate(
				deskIdVO,
				reservationDateString
			);
			if (deskAlreadyReserved) {
				throw new DeskAlreadyReservedError();
			}

			const userAlreadyReserved = await queryRepo.hasActiveReservationForUserOnDate(
				userIdVO,
				reservationDateString
			);
			if (userAlreadyReserved) {
				throw new UserAlreadyHasReservationError();
			}

			return commandRepo.create(
				userIdVO,
				reservationDateString,
				deskIdVO,
				reservationSource,
				officeIdVO
			);
		});
	}
}
