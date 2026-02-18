import type { FastifyPluginAsync } from "fastify";

import { buildReservationHandlers } from "@composition/reservations.container.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { ReservationController } from "./reservations.controller.js";

export const reservationsRoutes: FastifyPluginAsync = async app => {
	const handlers = buildReservationHandlers(app);
	const controller = new ReservationController(
		handlers.createReservationHandler,
		handlers.cancelReservationHandler,
		handlers.listUserReservationsHandler
	);
	const auth = withAuth(app);

	app.post("/", auth, (req, reply) => controller.create(req, reply));
	app.delete("/:id", auth, (req, reply) => controller.cancel(req, reply));
	app.get("/me", auth, (req, reply) => controller.listForUser(req, reply));
};
