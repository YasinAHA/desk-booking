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
	app.get("/desks", auth, controller.listDesks.bind(controller));
	app.patch("/desks/:id/layout", auth, controller.patchDeskLayout.bind(controller));
	app.patch("/desks/layout/bulk", auth, controller.patchDeskLayoutsBulk.bind(controller));
	app.post("/desks/layout/restore", auth, controller.restoreDeskLayouts.bind(controller));
	app.patch("/desks/:id/status", auth, controller.patchDeskStatus.bind(controller));
	app.post("/desk-blocks", auth, controller.createDeskBlock.bind(controller));
	app.get("/desks/qr", auth, controller.listDeskQrs.bind(controller));
	app.post("/desks/qr/regenerate-bulk", auth, controller.regenerateDeskQrsBulk.bind(controller));
	app.get("/floorplan", auth, controller.getFloorplanConfig.bind(controller));
	app.patch("/floorplan", auth, controller.patchFloorplanConfig.bind(controller));
	app.get("/floorplan/overlays", auth, controller.listFloorplanOverlays.bind(controller));
	app.post("/floorplan/overlays", auth, controller.createFloorplanOverlay.bind(controller));
	app.patch("/floorplan/overlays/:id", auth, controller.patchFloorplanOverlay.bind(controller));
	app.delete("/floorplan/overlays/:id", auth, controller.deleteFloorplanOverlay.bind(controller));
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
