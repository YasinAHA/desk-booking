import type { FastifyInstance } from "fastify";

import { RegenerateDeskQrHandler } from "@application/desks/commands/regenerate-desk-qr.handler.js";
import { RegenerateAllDesksQrHandler } from "@application/desks/commands/regenerate-all-desks-qr.handler.js";
import { ListAdminDesksHandler } from "@application/desks/queries/list-admin-desks.handler.js";
import { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";
import { PgDeskRepository } from "@infrastructure/desks/repositories/pg-desk-repository.js";

function buildDeskRepository(app: FastifyInstance): PgDeskRepository {
	return new PgDeskRepository(app.db);
}

export function buildListDesksHandler(app: FastifyInstance): ListDesksHandler {
	const deskRepo = buildDeskRepository(app);
	return new ListDesksHandler({ deskRepo });
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
