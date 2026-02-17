import type { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import type { CancelReservationCommand } from "@application/reservations/commands/cancel-reservation.command.js";
import type { CreateReservationHandler } from "@application/reservations/commands/create-reservation.handler.js";
import type { CreateReservationCommand } from "@application/reservations/commands/create-reservation.command.js";
import type { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";
import type { ListUserReservationsQuery } from "@application/reservations/queries/list-user-reservations.query.js";
import {
	ReservationConflictError,
	ReservationDateInPastError,
} from "@domain/reservations/entities/reservation.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import { dateSchema } from "@interfaces/http/schemas/date-schemas.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

/**
 * Schemas for reservation request validation
 */
const createSchema = z.object({
	date: dateSchema,
	desk_id: z.string().uuid(),
	office_id: z.string().uuid().optional(),
	source: z.enum(["user", "admin", "walk_in", "system"]).optional(),
});

const idParamSchema = z.object({
	id: z.string().uuid(),
});

/**
 * ReservationController: Handles HTTP layer concerns for reservation operations
 * - Request validation
 * - Response mapping
 * - Error mapping (DateInPast, Conflict)
 * - Logging and rate limiting (via app instance)
 *
 * Note: Injected FastifyInstance for logger and rate limiting metadata.
 * Could be refactored to inject Logger + RateLimiter separately if interfaces grow.
 */
export class ReservationController {
	constructor(
		private readonly createReservationHandler: CreateReservationHandler,
		private readonly cancelReservationHandler: CancelReservationHandler,
		private readonly listUserReservationsHandler: ListUserReservationsHandler,
		private readonly app: FastifyInstance
	) {}

	async create(req: FastifyRequest, reply: FastifyReply) {
		// Validation
		const parse = createSchema.safeParse(req.body);
		if (!parse.success) {
			this.app.log.warn({ body: req.body }, "Invalid reservation payload");
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		// Application logic
		try {
			const command: CreateReservationCommand = {
				userId: req.user.id,
				date: parse.data.date,
				deskId: parse.data.desk_id,
				...(parse.data.source ? { source: parse.data.source } : {}),
				...(parse.data.office_id ? { officeId: parse.data.office_id } : {}),
			};
			const reservationId = await this.createReservationHandler.execute(command);

			// Response mapping
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

			return reply.send({
				ok: true,
				reservation_id: reservationId,
			});
		} catch (err) {
			// Error mapping
			if (err instanceof ReservationDateInPastError) {
				throwHttpError(400, "DATE_IN_PAST", "Date in past");
			}

			if (err instanceof ReservationConflictError) {
				throwHttpError(409, "CONFLICT", "Reservation conflict");
			}

			throw err;
		}
	}

	async cancel(req: FastifyRequest, reply: FastifyReply) {
		// Validation
		const parse = idParamSchema.safeParse(req.params);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid id");
		}

		// Application logic
		try {
			const command: CancelReservationCommand = {
				userId: req.user.id,
				reservationId: parse.data.id,
			};
			const ok = await this.cancelReservationHandler.execute(command);

			// Error mapping
			if (!ok) {
				throwHttpError(404, "NOT_FOUND", "Reservation not found");
			}

			// Response mapping
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
			// Error mapping
			if (err instanceof ReservationDateInPastError) {
				throwHttpError(400, "DATE_IN_PAST", "Date in past");
			}

			throw err;
		}
	}

	async listForUser(req: FastifyRequest, reply: FastifyReply) {
		// Application logic
		const query: ListUserReservationsQuery = { userId: req.user.id };
		const items = await this.listUserReservationsHandler.execute(query);

		// Response mapping
		return reply.send({
			items: items.map(item => ({
				reservation_id: item.id,
				desk_id: item.deskId,
				office_id: item.officeId,
				desk_name: item.deskName,
				reservation_date: item.reservationDate,
				source: item.source,
				cancelled_at: item.cancelledAt,
			})),
		});
	}
}
