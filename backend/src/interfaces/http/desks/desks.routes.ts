import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";

import {
	buildCheckAdminAccessHandler,
	buildRegenerateAllDesksQrHandler,
	buildListAdminDesksHandler,
	buildListDesksHandler,
	buildRegenerateDeskQrHandler,
} from "@composition/desks.container.js";
import { sendError } from "@interfaces/http/http-errors.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { DeskController } from "./desks.controller.js";

function withAdmin(app: Parameters<typeof withAuth>[0]): { preHandler: preHandlerHookHandler[] } {
	const auth = withAuth(app);
	const checkAdminAccessHandler = buildCheckAdminAccessHandler(app);

	const ensureAdmin: preHandlerHookHandler = (req, reply, done) => {
		void checkAdminAccessHandler
			.execute({ userId: req.user.id })
			.then(isAdmin => {
				if (!isAdmin) {
					sendError(reply, 403, "FORBIDDEN", "Forbidden");
				}
			})
			.catch(error => {
				req.log.error(
					{ event: "auth.admin_access_error", userId: req.user.id, error },
					"Admin authorization check failed"
				);
				sendError(reply, 500, "INTERNAL_ERROR", "Internal server error");
			})
			.finally(() => {
				done();
			});
	};

	return {
		preHandler: [auth.preHandler, ensureAdmin],
	};
}

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
	app.get("/admin", withAdmin(app), (req, reply) => controller.listAdmin(req, reply));
	app.post("/admin/:id/qr/regenerate", withAdmin(app), (req, reply) =>
		controller.regenerateQr(req, reply)
	);
	app.post("/admin/qr/regenerate-all", withAdmin(app), (req, reply) =>
		controller.regenerateAllQr(req, reply)
	);
};
