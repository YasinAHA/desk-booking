import type { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import type { CancelReservationCommand } from "@application/reservations/commands/cancel-reservation.command.js";
import type { CreateReservationHandler } from "@application/reservations/commands/create-reservation.handler.js";
import type { CreateReservationCommand } from "@application/reservations/commands/create-reservation.command.js";
import type { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";
import type { ListUserReservationsQuery } from "@application/reservations/queries/list-user-reservations.query.js";
import {
	DeskAlreadyReservedError,
	ReservationConflictError,
	ReservationDateInPastError,
	UserAlreadyHasReservationError,
} from "@domain/reservations/entities/reservation.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import {
	mapCreateReservationResponse,
	mapListUserReservationsResponse,
} from "./reservations.mappers.js";
import {
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
		private readonly listUserReservationsHandler: ListUserReservationsHandler
	) {}

	async create(req: FastifyRequest, reply: FastifyReply) {
		const parse = createReservationSchema.safeParse(req.body);
		if (!parse.success) {
			req.log.warn({ body: req.body }, "Invalid reservation payload");
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const command: CreateReservationCommand = {
				userId: req.user.id,
				date: parse.data.date,
				deskId: parse.data.desk_id,
				...(parse.data.source ? { source: parse.data.source } : {}),
				...(parse.data.office_id ? { officeId: parse.data.office_id } : {}),
			};
			const reservationId = await this.createReservationHandler.execute(command);

			req.log.info(
				{
					event: "reservation.create",
					userId: req.user.id,
					deskId: parse.data.desk_id,
					date: parse.data.date,
					reservationId,
				},
				"Reservation created"
			);

			return reply.send(mapCreateReservationResponse(reservationId));
		} catch (err) {
			if (err instanceof ReservationDateInPastError) {
				throwHttpError(400, "DATE_IN_PAST", "Date in past");
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

			throw err;
		}
	}

	async listForUser(req: FastifyRequest, reply: FastifyReply) {
		const query: ListUserReservationsQuery = { userId: req.user.id };
		const items = await this.listUserReservationsHandler.execute(query);

		return reply.send(mapListUserReservationsResponse(items));
	}
}
