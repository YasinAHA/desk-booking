import type { FastifyInstance } from "fastify";

import { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";
import { PgDeskRepository } from "@infrastructure/desks/repositories/pg-desk-repository.js";

export function buildListDesksHandler(app: FastifyInstance): ListDesksHandler {
	const deskRepo = new PgDeskRepository(app.db);
	return new ListDesksHandler({ deskRepo });
}


