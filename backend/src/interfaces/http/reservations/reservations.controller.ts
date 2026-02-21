import type { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import type { CancelReservationCommand } from "@application/reservations/commands/cancel-reservation.command.js";
import type { CheckInByQrHandler } from "@application/reservations/commands/check-in-by-qr.handler.js";
import type { CheckInByQrCommand } from "@application/reservations/commands/check-in-by-qr.command.js";
import type { CreateReservationHandler } from "@application/reservations/commands/create-reservation.handler.js";
import type { CreateReservationCommand } from "@application/reservations/commands/create-reservation.command.js";
import type { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";
import type { ListUserReservationsQuery } from "@application/reservations/queries/list-user-reservations.query.js";
import {
	DeskAlreadyReservedError,
	ReservationDateInvalidError,
	ReservationConflictError,
	ReservationCancellationWindowClosedError,
	ReservationDateInPastError,
	ReservationNotCancellableError,
	ReservationOnNonWorkingDayError,
	ReservationSameDayBookingClosedError,
	UserAlreadyHasReservationError,
} from "@domain/reservations/entities/reservation.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import {
	mapCreateReservationResponse,
	mapListUserReservationsResponse,
	mapQrCheckInResponse,
} from "./reservations.mappers.js";
import {
	checkInByQrSchema,
	createReservationSchema,
	reservationIdParamSchema,
} from "./reservations.schemas.js";

/**
 * ReservationController: Handles HTTP layer concerns for reservation operations
 * - Request validation
 * - Response mapping
 * - Error mapping (DateInPast, Conflict)
 */
export class ReservationController {
	constructor(
		private readonly createReservationHandler: CreateReservationHandler,
		private readonly cancelReservationHandler: CancelReservationHandler,
		private readonly checkInByQrHandler: CheckInByQrHandler,
		private readonly listUserReservationsHandler: ListUserReservationsHandler
	) {}

	async create(req: FastifyRequest, reply: FastifyReply) {
		const parse = createReservationSchema.safeParse(req.body);
		if (!parse.success) {
			req.log.warn({ body: req.body }, "Invalid reservation payload");
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const command = this.buildCreateReservationCommand(req.user.id, parse.data);
			const reservationId = await this.createReservationHandler.execute(command);

			req.log.info(
				{
					event: "reservation.create",
					userId: req.user.id,
					deskId: parse.data.deskId,
					date: parse.data.date,
					reservationId,
				},
				"Reservation created"
			);

			return reply.send(mapCreateReservationResponse(reservationId));
		} catch (err) {
			this.rethrowCreateError(err);
		}
	}

	async cancel(req: FastifyRequest, reply: FastifyReply) {
		const parse = reservationIdParamSchema.safeParse(req.params);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid id");
		}

		try {
			const command: CancelReservationCommand = {
				userId: req.user.id,
				reservationId: parse.data.id,
			};
			const ok = await this.cancelReservationHandler.execute(command);

			if (!ok) {
				throwHttpError(404, "NOT_FOUND", "Reservation not found");
			}

			req.log.info(
				{
					event: "reservation.cancel",
					userId: req.user.id,
					reservationId: parse.data.id,
				},
				"Reservation cancelled"
			);

			return reply.status(204).send();
		} catch (err) {
			if (err instanceof ReservationDateInPastError) {
				throwHttpError(400, "DATE_IN_PAST", "Date in past");
			}
			if (err instanceof ReservationNotCancellableError) {
				throwHttpError(
					409,
					"RESERVATION_NOT_CANCELLABLE",
					"No se puede cancelar una reserva ya iniciada."
				);
			}
			if (err instanceof ReservationCancellationWindowClosedError) {
				throwHttpError(
					409,
					"CANCELLATION_WINDOW_CLOSED",
					"La jornada ya ha comenzado. Ya no se puede cancelar la reserva de hoy."
				);
			}

			throw err;
		}
	}

	async listForUser(req: FastifyRequest, reply: FastifyReply) {
		const query: ListUserReservationsQuery = { userId: req.user.id };
		const items = await this.listUserReservationsHandler.execute(query);

		return reply.send(mapListUserReservationsResponse(items));
	}

	async checkInByQr(req: FastifyRequest, reply: FastifyReply) {
		const parse = checkInByQrSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const command: CheckInByQrCommand = {
			userId: req.user.id,
			date: parse.data.date,
			qrPublicId: parse.data.qrPublicId,
		};
		const result = await this.checkInByQrHandler.execute(command);

		if (result === "not_found") {
			throwHttpError(404, "RESERVATION_NOT_FOUND", "No reservation found for this QR and date.");
		}
		if (result === "not_active") {
			throwHttpError(409, "RESERVATION_NOT_ACTIVE", "Reservation is not active for check-in.");
		}

		req.log.info(
			{
				event: "reservation.check_in",
				userId: req.user.id,
				qrPublicId: parse.data.qrPublicId,
				date: parse.data.date,
				result,
			},
			"Reservation check-in processed"
		);

		return reply.send(mapQrCheckInResponse(result));
	}

	private buildCreateReservationCommand(
		userId: string,
		payload: {
			date: string;
			deskId: string;
			officeId?: string | undefined;
			source?: "user" | "admin" | "walk_in" | "system" | undefined;
		}
	): CreateReservationCommand {
		return {
			userId,
			date: payload.date,
			deskId: payload.deskId,
			...(payload.source ? { source: payload.source } : {}),
			...(payload.officeId ? { officeId: payload.officeId } : {}),
		};
	}

	private rethrowCreateError(err: unknown): never {
		if (err instanceof ReservationDateInvalidError) {
			throwHttpError(400, "DATE_INVALID", "Invalid reservation date");
		}
		if (err instanceof ReservationDateInPastError) {
			throwHttpError(400, "DATE_IN_PAST", "Date in past");
		}
		if (err instanceof ReservationOnNonWorkingDayError) {
			throwHttpError(400, "NON_WORKING_DAY", "No se permite reservar en fin de semana.");
		}
		if (err instanceof ReservationSameDayBookingClosedError) {
			throwHttpError(
				409,
				"SAME_DAY_BOOKING_CLOSED",
				"La jornada ya ha comenzado. Para hoy solo se permite walk-in."
			);
		}
		if (err instanceof DeskAlreadyReservedError) {
			throwHttpError(409, "DESK_ALREADY_RESERVED", "Ese escritorio ya está reservado.");
		}
		if (err instanceof UserAlreadyHasReservationError) {
			throwHttpError(
				409,
				"USER_ALREADY_HAS_RESERVATION",
				"Ya tienes una reserva activa para ese día."
			);
		}
		if (err instanceof ReservationConflictError) {
			throwHttpError(409, "CONFLICT", "Reservation conflict");
		}
		throw err;
	}
}
