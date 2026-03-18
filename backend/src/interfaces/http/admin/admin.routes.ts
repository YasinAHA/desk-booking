import type { FastifyPluginAsync } from "fastify";

import { buildAdminService } from "@composition/admin.container.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { AdminController } from "./admin.controller.js";

export const adminRoutes: FastifyPluginAsync = async app => {
	const adminService = buildAdminService(app);
	const controller = new AdminController(adminService);
	const auth = withAuth(app);

	app.get("/settings", auth, (req, reply) => controller.getSettings(req, reply));
	app.patch("/settings", auth, (req, reply) => controller.patchSettings(req, reply));

	app.get("/reservations", auth, (req, reply) => controller.listReservations(req, reply));
	app.post("/reservations", auth, (req, reply) => controller.createReservation(req, reply));
	app.patch("/reservations/:id", auth, (req, reply) =>
		controller.patchReservationStatus(req, reply)
	);

	app.get("/reports/occupancy", auth, (req, reply) => controller.getOccupancyReport(req, reply));
	app.get("/reports/no-shows", auth, (req, reply) => controller.getNoShowsReport(req, reply));
	app.get("/reports/summary", auth, (req, reply) => controller.getSummaryReport(req, reply));
};
