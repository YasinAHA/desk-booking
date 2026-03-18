import type { FastifyPluginAsync } from "fastify";

import { buildAdminService } from "@composition/admin.container.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { AdminController } from "./admin.controller.js";

export const adminRoutes: FastifyPluginAsync = async app => {
	const adminService = buildAdminService(app);
	const controller = new AdminController(adminService);
	const auth = withAuth(app);

	app.get("/settings", auth, controller.getSettings.bind(controller));
	app.patch("/settings", auth, controller.patchSettings.bind(controller));
	app.get("/users", auth, controller.listUsers.bind(controller));
	app.patch("/users/:id", auth, controller.patchUser.bind(controller));

	app.get("/reservations", auth, controller.listReservations.bind(controller));
	app.post("/reservations", auth, controller.createReservation.bind(controller));
	app.patch("/reservations/:id", auth, controller.patchReservationStatus.bind(controller));

	app.get("/reports/occupancy", auth, controller.getOccupancyReport.bind(controller));
	app.get("/reports/cancellations", auth, controller.getCancellationsReport.bind(controller));
	app.get("/reports/no-shows", auth, controller.getNoShowsReport.bind(controller));
	app.get("/reports/audit-log", auth, controller.getAuditLogReport.bind(controller));
	app.get("/reports/summary", auth, controller.getSummaryReport.bind(controller));
};
