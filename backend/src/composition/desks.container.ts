import type { FastifyInstance } from "fastify";

import { DeskUseCase } from "@application/desks/handlers/desk.usecase.js";
import { PgDeskRepository } from "@infrastructure/desks/repositories/pg-desk-repository.js";

export function buildDeskUseCase(app: FastifyInstance): DeskUseCase {
	const deskRepo = new PgDeskRepository(app.db);
	return new DeskUseCase(deskRepo);
}


