import type { CreateReservationCommand } from "@application/reservations/commands/create-reservation.command.js";
import type {
	TransactionManager,
	TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import type { AuditEventWriter } from "@application/common/ports/audit-event-writer.js";
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
import {
	isSameDayBookingClosed,
	isWorkingDayReservationDate,
} from "@domain/reservations/policies/reservation-policy.js";
import {
	createDeskId,
	deskIdToString,
} from "@domain/desks/value-objects/desk-id.js";
import {
	createOfficeId,
	officeIdToString,
} from "@domain/desks/value-objects/office-id.js";
import {
	InvalidReservationDateError,
	type ReservationDate,
	createReservationDate,
	isReservationDateInPast,
	reservationDateToString,
} from "@domain/reservations/value-objects/reservation-date.js";
import { createUserId, userIdToString } from "@domain/auth/value-objects/user-id.js";

type CreateReservationDependencies = {
	txManager: TransactionManager;
	commandRepoFactory: (tx: TransactionalContext) => ReservationCommandRepository;
	queryRepoFactory: (tx: TransactionalContext) => ReservationQueryRepository;
	noShowPolicyServiceFactory: (tx: TransactionalContext) => NoShowPolicyService;
	auditWriterFactory: (tx: TransactionalContext) => AuditEventWriter;
	nowProvider?: () => Date;
};

export class CreateReservationHandler {
	constructor(private readonly deps: CreateReservationDependencies) {}

	async execute(command: CreateReservationCommand): Promise<string> {
		const userIdVO = createUserId(command.userId);
		const deskIdVO = createDeskId(command.deskId);
		const officeIdVO = command.officeId ? createOfficeId(command.officeId) : null;
		const reservationSource: ReservationSource = command.source ?? "user";
		const startsAt = command.startsAt;
		const endsAt = command.endsAt;
		const hasRange = typeof startsAt === "string" && typeof endsAt === "string";

		let reservationDate: ReservationDate;
		try {
			const date = command.date ?? startsAt?.slice(0, 10);
			if (!date) {
				throw new InvalidReservationDateError("Missing date or startsAt");
			}
			reservationDate = createReservationDate(date);
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
			const auditWriter = this.deps.auditWriterFactory(tx);

			await noShowPolicyService.markNoShowExpiredForDate(reservationDateString);

			const bookingPolicyContext =
				await queryRepo.getDeskBookingPolicyContext(deskIdVO);
			const now = this.deps.nowProvider?.();
			if (
				bookingPolicyContext &&
				isSameDayBookingClosed({
					reservationDate: reservationDateString,
					timezone: bookingPolicyContext.timezone,
					checkinAllowedFrom: bookingPolicyContext.checkinAllowedFrom,
					...(now ? { now } : {}),
				})
			) {
				throw new ReservationSameDayBookingClosedError();
			}

			// Deterministic UX: check desk conflict first, then user/day conflict.
			const deskAlreadyReserved = hasRange
				? await queryRepo.hasActiveReservationForDeskInRange(
						deskIdVO,
						startsAt,
						endsAt
					)
				: await queryRepo.hasActiveReservationForDeskOnDate(
						deskIdVO,
						reservationDateString
					);
			if (deskAlreadyReserved) {
				throw new DeskAlreadyReservedError();
			}

			const userAlreadyReserved = hasRange
				? await queryRepo.hasActiveReservationForUserInRange(
						userIdVO,
						startsAt,
						endsAt
					)
				: await queryRepo.hasActiveReservationForUserOnDate(
						userIdVO,
						reservationDateString
					);
			if (userAlreadyReserved) {
				throw new UserAlreadyHasReservationError();
			}

			const reservationId = await commandRepo.create(
				userIdVO,
				reservationDateString,
				deskIdVO,
				reservationSource,
				officeIdVO,
				startsAt,
				endsAt
			);
			let actorType: "user" | "admin" | "system" = "user";
			if (reservationSource === "admin") {
				actorType = "admin";
			} else if (reservationSource === "system") {
				actorType = "system";
			}
			await auditWriter.append({
				eventType: "reservation_created",
				actorType,
				actorUserId: userIdToString(userIdVO),
				reservationId,
				deskId: deskIdToString(deskIdVO),
				officeId: officeIdVO ? officeIdToString(officeIdVO) : null,
				metadata: {
					source: reservationSource,
					mode: hasRange ? "range" : "date",
				},
			});

			return reservationId;
		});
	}
}
