import type { FastifyPluginAsync } from "fastify";

import { buildListDesksHandler } from "@composition/desks.container.js";
import { DeskController } from "./desks.controller.js";

export const desksRoutes: FastifyPluginAsync = async app => {
	const listDesksHandler = buildListDesksHandler(app);
	const controller = new DeskController(listDesksHandler, app);

	app.get(
		"/",
		{
			preHandler: (req, reply, done) => {
				app.requireAuth(req, reply, done);
			},
		},
		(req, reply) => controller.listForDate(req, reply)
	);
};
