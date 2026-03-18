import type { FastifyInstance } from "fastify";

import { AdminService } from "@application/admin/services/admin.service.js";
import { PgUserAuthorizationRepository } from "@infrastructure/auth/repositories/pg-user-authorization-repository.js";
import { PgAdminRepository } from "@infrastructure/admin/repositories/pg-admin-repository.js";

export function buildAdminService(app: FastifyInstance): AdminService {
	const userAuthorizationRepo = new PgUserAuthorizationRepository(app.db);
	const adminRepo = new PgAdminRepository(app.db);
	return new AdminService({ adminRepo, userAuthorizationRepo });
}
