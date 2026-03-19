import type { UserPreferencesService } from "@application/me/services/user-preferences.service.js";
import type { UserPreferencesPatch } from "@application/me/ports/user-preferences-repository.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import { userPreferencesPatchSchema } from "./me.schemas.js";

export class MeController {
	constructor(private readonly userPreferencesService: UserPreferencesService) {}

	async getPreferences(req: FastifyRequest, reply: FastifyReply) {
		const preferences = await this.userPreferencesService.getByUserId(req.user.id);
		return reply.send(preferences);
	}

	async patchPreferences(req: FastifyRequest, reply: FastifyReply) {
		const parse = userPreferencesPatchSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}

		const patch: UserPreferencesPatch = {};
		if (parse.data.theme !== undefined) {
			patch.theme = parse.data.theme;
		}
		if (parse.data.language !== undefined) {
			patch.language = parse.data.language;
		}
		if (parse.data.timezone !== undefined) {
			patch.timezone = parse.data.timezone;
		}
		if (parse.data.emailNotificationsEnabled !== undefined) {
			patch.emailNotificationsEnabled = parse.data.emailNotificationsEnabled;
		}

		const preferences = await this.userPreferencesService.updateByUserId(req.user.id, patch);
		return reply.send(preferences);
	}
}
