import type { FastifyInstance } from "fastify";

import { DeskUseCase } from "../../../application/usecases/desk.usecase.js";
import { PgDeskRepository } from "../../../infrastructure/repositories/pgDeskRepository.js";

export function buildDeskUseCase(app: FastifyInstance): DeskUseCase {
	const deskRepo = new PgDeskRepository(app.db);
	return new DeskUseCase(deskRepo);
}
