import type { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";
import type { ListDesksQuery } from "@application/desks/queries/list-desks.query.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { mapListDesksResponse } from "./desks.mappers.js";
import { listDesksSchema } from "./desks.schemas.js";

/**
 * DeskController: Handles HTTP layer concerns for desk operations
 * - Request validation
 * - Response mapping
 * - Error handling
 */
export class DeskController {
	constructor(private readonly listDesksHandler: ListDesksHandler) {}

	async listForDate(req: FastifyRequest, reply: FastifyReply) {
		const parse = listDesksSchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid date");
		}

		const userId = req.user.id;
		const query: ListDesksQuery = { date: parse.data.date, userId };
		const desks = await this.listDesksHandler.execute(query);

		return reply.send(mapListDesksResponse(parse.data.date, desks));
	}
}
