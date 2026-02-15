import type { FastifyInstance } from "fastify";

import { ReservationUseCase } from "../../../application/usecases/reservation.usecase.js";
import { PgReservationCommandRepository } from "../../../infrastructure/repositories/pgReservationCommandRepository.js";
import { PgReservationQueryRepository } from "../../../infrastructure/repositories/pgReservationQueryRepository.js";
import { PgErrorTranslator } from "../../../infrastructure/services/error-translator.js";

export function buildReservationUseCase(
	app: FastifyInstance
): ReservationUseCase {
	const errorTranslator = new PgErrorTranslator();
	const commandRepo = new PgReservationCommandRepository(app.db, errorTranslator);
	const queryRepo = new PgReservationQueryRepository(app.db);
	return new ReservationUseCase(commandRepo, queryRepo);
}
