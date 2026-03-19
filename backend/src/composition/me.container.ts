import type { FastifyInstance } from "fastify";

import { UserPreferencesService } from "@application/me/services/user-preferences.service.js";
import { PgUserPreferencesRepository } from "@infrastructure/me/repositories/pg-user-preferences-repository.js";

export function buildUserPreferencesService(app: FastifyInstance): UserPreferencesService {
	const userPreferencesRepo = new PgUserPreferencesRepository(app.db);
	return new UserPreferencesService({ userPreferencesRepo });
}

