import type { FastifyPluginAsync } from "fastify";

import { buildDeskUseCase } from "./desks.container.js";
import { DeskController } from "./desks.controller.js";

export const desksRoutes: FastifyPluginAsync = async app => {
	const deskUseCase = buildDeskUseCase(app);
	const controller = new DeskController(deskUseCase, app);

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
