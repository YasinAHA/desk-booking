import type { FastifyInstance } from "fastify";

import { AdminService } from "@application/admin/services/admin.service.js";
import { PgUserAuthorizationRepository } from "@infrastructure/auth/repositories/pg-user-authorization-repository.js";
import { PgAdminRepository } from "@infrastructure/admin/repositories/pg-admin-repository.js";
import { PgAuditEventWriter } from "@infrastructure/audit/pg-audit-event-writer.js";

export function buildAdminService(app: FastifyInstance): AdminService {
	const userAuthorizationRepo = new PgUserAuthorizationRepository(app.db);
	const adminRepo = new PgAdminRepository(app.db, app.runtimeAppSettings);
	const auditWriter = new PgAuditEventWriter(app.db);
	return new AdminService({ adminRepo, userAuthorizationRepo, auditWriter });
}
