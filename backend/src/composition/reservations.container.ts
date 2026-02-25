import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";

import {
	getTransactionalDbClient,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import { CheckInByQrHandler } from "@application/reservations/commands/check-in-by-qr.handler.js";
import { CreateReservationHandler } from "@application/reservations/commands/create-reservation.handler.js";
import { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";
import { PgTransactionManager } from "@infrastructure/db/pg-transaction-manager.js";
import { PgReservationCommandRepository } from "@infrastructure/reservations/repositories/pg-reservation-command-repository.js";
import { PgReservationQueryRepository } from "@infrastructure/reservations/repositories/pg-reservation-query-repository.js";
import { PgNoShowPolicyService } from "@infrastructure/reservations/services/pg-no-show-policy-service.js";
import { PgErrorTranslator } from "@infrastructure/services/error-translator.js";

type AppWithDb = FastifyInstance & {
	db: {
		query: (
			text: string,
			params?: unknown[]
		) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
		pool: Pool;
	};
};

export function buildReservationHandlers(app: FastifyInstance): {
	createReservationHandler: CreateReservationHandler;
	cancelReservationHandler: CancelReservationHandler;
	checkInByQrHandler: CheckInByQrHandler;
	listUserReservationsHandler: ListUserReservationsHandler;
} {
	const dbApp = app as AppWithDb;
	const errorTranslator = new PgErrorTranslator();
	const txManager = new PgTransactionManager(dbApp.db.pool);

	const commandRepo = new PgReservationCommandRepository(dbApp.db, errorTranslator);
	const queryRepo = new PgReservationQueryRepository(dbApp.db);
	const noShowPolicyService = new PgNoShowPolicyService(dbApp.db);

	const commandRepoFactory = (tx: TransactionalContext) =>
		new PgReservationCommandRepository(getTransactionalDbClient(tx), errorTranslator);
	const queryRepoFactory = (tx: TransactionalContext) =>
		new PgReservationQueryRepository(getTransactionalDbClient(tx));
	const noShowPolicyServiceFactory = (tx: TransactionalContext): NoShowPolicyService =>
		new PgNoShowPolicyService(getTransactionalDbClient(tx));

	return {
		createReservationHandler: new CreateReservationHandler({
			txManager,
			commandRepoFactory,
			queryRepoFactory,
			noShowPolicyServiceFactory,
		}),
		cancelReservationHandler: new CancelReservationHandler({ commandRepo, queryRepo }),
		checkInByQrHandler: new CheckInByQrHandler({ commandRepo, queryRepo, noShowPolicyService }),
		listUserReservationsHandler: new ListUserReservationsHandler({ queryRepo }),
	};
}

