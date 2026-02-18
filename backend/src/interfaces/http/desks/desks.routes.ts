import type { FastifyPluginAsync } from "fastify";

import { buildListDesksHandler } from "@composition/desks.container.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { DeskController } from "./desks.controller.js";

export const desksRoutes: FastifyPluginAsync = async app => {
	const listDesksHandler = buildListDesksHandler(app);
	const controller = new DeskController(listDesksHandler);

	app.get("/", withAuth(app), (req, reply) => controller.listForDate(req, reply));
};
