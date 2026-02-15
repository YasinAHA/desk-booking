import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { ReservationUseCase } from "../../../application/usecases/reservation.usecase.js";
import {
	ReservationConflictError,
	ReservationDateInPastError,
} from "../../../domain/entities/reservation.js";
import { throwHttpError } from "../http-errors.js";
import { dateSchema } from "../schemas/date-schemas.js";

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
		private readonly reservationUseCase: ReservationUseCase,
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
			const reservationId = await this.reservationUseCase.create(
				req.user.id,
				parse.data.date,
				parse.data.desk_id,
				parse.data.source,
				parse.data.office_id
			);

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
			const ok = await this.reservationUseCase.cancel(req.user.id, parse.data.id);

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
		const items = await this.reservationUseCase.listForUser(req.user.id);

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
