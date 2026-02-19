import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";

import {
	buildListAdminDesksHandler,
	buildListDesksHandler,
	buildRegenerateDeskQrHandler,
} from "@composition/desks.container.js";
import { sendError } from "@interfaces/http/http-errors.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { DeskController } from "./desks.controller.js";

function withAdmin(app: Parameters<typeof withAuth>[0]): { preHandler: preHandlerHookHandler[] } {
	const auth = withAuth(app);

	const ensureAdmin: preHandlerHookHandler = (req, reply, done) => {
		void app.db
			.query("select role from users where id = $1 limit 1", [req.user.id])
			.then(result => {
				const row = result.rows[0] as { role?: unknown } | undefined;
				if (row?.role !== "admin") {
					sendError(reply, 403, "FORBIDDEN", "Forbidden");
				}
			})
			.catch(() => {
				sendError(reply, 403, "FORBIDDEN", "Forbidden");
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
	const controller = new DeskController(
		listDesksHandler,
		listAdminDesksHandler,
		regenerateDeskQrHandler
	);

	app.get("/", withAuth(app), (req, reply) => controller.listForDate(req, reply));
	app.get("/admin", withAdmin(app), (req, reply) => controller.listAdmin(req, reply));
	app.post("/admin/:id/qr/regenerate", withAdmin(app), (req, reply) =>
		controller.regenerateQr(req, reply)
	);
};
