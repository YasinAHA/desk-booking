import type { FastifyInstance } from "fastify";

import { CheckAdminAccessHandler } from "@application/auth/queries/check-admin-access.handler.js";
import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import { RegenerateDeskQrHandler } from "@application/desks/commands/regenerate-desk-qr.handler.js";
import { RegenerateAllDesksQrHandler } from "@application/desks/commands/regenerate-all-desks-qr.handler.js";
import { ListAdminDesksHandler } from "@application/desks/queries/list-admin-desks.handler.js";
import { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";
import { PgUserAuthorizationRepository } from "@infrastructure/auth/repositories/pg-user-authorization-repository.js";
import { PgDeskRepository } from "@infrastructure/desks/repositories/pg-desk-repository.js";
import { PgNoShowPolicyService } from "@infrastructure/reservations/services/pg-no-show-policy-service.js";

function buildDeskRepository(app: FastifyInstance): PgDeskRepository {
	return new PgDeskRepository(app.db);
}

function buildUserAuthorizationRepository(app: FastifyInstance): PgUserAuthorizationRepository {
	return new PgUserAuthorizationRepository(app.db);
}

function buildNoShowPolicyService(app: FastifyInstance): NoShowPolicyService {
	return new PgNoShowPolicyService(app.db);
}

export function buildListDesksHandler(app: FastifyInstance): ListDesksHandler {
	const deskRepo = buildDeskRepository(app);
	const noShowPolicyService = buildNoShowPolicyService(app);
	return new ListDesksHandler({ deskRepo, noShowPolicyService });
}

export function buildListAdminDesksHandler(app: FastifyInstance): ListAdminDesksHandler {
	const deskRepo = buildDeskRepository(app);
	return new ListAdminDesksHandler({ deskRepo });
}

export function buildRegenerateDeskQrHandler(app: FastifyInstance): RegenerateDeskQrHandler {
	const deskRepo = buildDeskRepository(app);
	return new RegenerateDeskQrHandler({ deskRepo });
}

export function buildRegenerateAllDesksQrHandler(app: FastifyInstance): RegenerateAllDesksQrHandler {
	const deskRepo = buildDeskRepository(app);
	return new RegenerateAllDesksQrHandler({ deskRepo });
}

export function buildCheckAdminAccessHandler(app: FastifyInstance): CheckAdminAccessHandler {
	const userAuthorizationRepo = buildUserAuthorizationRepository(app);
	return new CheckAdminAccessHandler({ userAuthorizationRepo });
}
