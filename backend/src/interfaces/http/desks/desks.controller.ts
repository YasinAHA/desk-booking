import type { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";
import type { ListDesksQuery } from "@application/desks/queries/list-desks.query.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import { dateSchema } from "@interfaces/http/schemas/date-schemas.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

/**
 * Schemas for desks request validation
 */
const listSchema = z.object({
	date: dateSchema,
});

/**
 * DeskController: Handles HTTP layer concerns for desk operations
 * - Request validation
 * - Response mapping
 * - Error handling
 * - Logging (via app instance)
 *
 * Note: Injected FastifyInstance for logger.
 * Could be refactored to inject Logger separately if controller grows.
 */
export class DeskController {
	constructor(
		private readonly listDesksHandler: ListDesksHandler,
		private readonly app: FastifyInstance
	) {}

	async listForDate(req: FastifyRequest, reply: FastifyReply) {
		// Validation
		const parse = listSchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid date");
		}

		// Application logic
		const userId = req.user.id;
		const query: ListDesksQuery = { date: parse.data.date, userId };
		const desks = await this.listDesksHandler.execute(query);

		// Response mapping
		return reply.send({
			date: parse.data.date,
			items: desks,
		});
	}
}
