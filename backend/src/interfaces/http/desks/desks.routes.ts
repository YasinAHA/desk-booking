import type { FastifyPluginAsync } from "fastify";

import {
	buildRegenerateAllDesksQrHandler,
	buildListAdminDesksHandler,
	buildListDesksHandler,
	buildRegenerateDeskQrHandler,
} from "@composition/desks.container.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { DeskController } from "./desks.controller.js";

export const desksRoutes: FastifyPluginAsync = async app => {
	const listDesksHandler = buildListDesksHandler(app);
	const listAdminDesksHandler = buildListAdminDesksHandler(app);
	const regenerateDeskQrHandler = buildRegenerateDeskQrHandler(app);
	const regenerateAllDesksQrHandler = buildRegenerateAllDesksQrHandler(app);
	const controller = new DeskController(
		listDesksHandler,
		listAdminDesksHandler,
		regenerateDeskQrHandler,
		regenerateAllDesksQrHandler
	);

	app.get("/", withAuth(app), (req, reply) => controller.listForDate(req, reply));
	app.get("/admin", withAuth(app), (req, reply) => controller.listAdmin(req, reply));
	app.post("/admin/:id/qr/regenerate", withAuth(app), (req, reply) =>
		controller.regenerateQr(req, reply)
	);
	app.post("/admin/qr/regenerate-all", withAuth(app), (req, reply) =>
		controller.regenerateAllQr(req, reply)
	);
};
