import type { FastifyInstance } from "fastify";

import { ReservationUseCase } from "../../../application/usecases/reservation.usecase.js";
import { PgReservationCommandRepository } from "../../../infrastructure/repositories/pg-reservation-command-repository.js";
import { PgReservationQueryRepository } from "../../../infrastructure/repositories/pg-reservation-query-repository.js";
import { PgErrorTranslator } from "../../../infrastructure/services/error-translator.js";

export function buildReservationUseCase(
	app: FastifyInstance
): ReservationUseCase {
	const errorTranslator = new PgErrorTranslator();
	const commandRepo = new PgReservationCommandRepository(app.db, errorTranslator);
	const queryRepo = new PgReservationQueryRepository(app.db);
	return new ReservationUseCase(commandRepo, queryRepo);
}
