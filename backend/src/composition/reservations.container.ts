import type { FastifyInstance } from "fastify";

import { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import { CreateReservationHandler } from "@application/reservations/commands/create-reservation.handler.js";
import { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";
import { PgReservationCommandRepository } from "@infrastructure/reservations/repositories/pg-reservation-command-repository.js";
import { PgReservationQueryRepository } from "@infrastructure/reservations/repositories/pg-reservation-query-repository.js";
import { PgErrorTranslator } from "@infrastructure/services/error-translator.js";

export function buildReservationHandlers(app: FastifyInstance): {
	createReservationHandler: CreateReservationHandler;
	cancelReservationHandler: CancelReservationHandler;
	listUserReservationsHandler: ListUserReservationsHandler;
} {
	const errorTranslator = new PgErrorTranslator();
	const commandRepo = new PgReservationCommandRepository(app.db, errorTranslator);
	const queryRepo = new PgReservationQueryRepository(app.db);

	return {
		createReservationHandler: new CreateReservationHandler({ commandRepo, queryRepo }),
		cancelReservationHandler: new CancelReservationHandler({ commandRepo, queryRepo }),
		listUserReservationsHandler: new ListUserReservationsHandler({ queryRepo }),
	};
}
