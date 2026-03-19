import type { FastifyPluginAsync } from "fastify";

import { buildUserPreferencesService } from "@composition/me.container.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";

import { MeController } from "./me.controller.js";

export const meRoutes: FastifyPluginAsync = async app => {
	const service = buildUserPreferencesService(app);
	const controller = new MeController(service);
	const auth = withAuth(app);

	app.get("/preferences", auth, (req, reply) => controller.getPreferences(req, reply));
	app.patch("/preferences", auth, (req, reply) => controller.patchPreferences(req, reply));
};

