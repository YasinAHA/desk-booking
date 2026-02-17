import type { FastifyPluginAsync } from "fastify";

import { buildReservationHandlers } from "@composition/reservations.container.js";
import { ReservationController } from "./reservations.controller.js";

export const reservationsRoutes: FastifyPluginAsync = async app => {
	const handlers = buildReservationHandlers(app);
	const controller = new ReservationController(
		handlers.createReservationHandler,
		handlers.cancelReservationHandler,
		handlers.listUserReservationsHandler,
		app
	);

	app.post(
		"/",
		{
			preHandler: (req, reply, done) => {
				app.requireAuth(req, reply, done);
			},
		},
		(req, reply) => controller.create(req, reply)
	);

	app.delete(
		"/:id",
		{
			preHandler: (req, reply, done) => {
				app.requireAuth(req, reply, done);
			},
		},
		(req, reply) => controller.cancel(req, reply)
	);

	app.get(
		"/me",
		{
			preHandler: (req, reply, done) => {
				app.requireAuth(req, reply, done);
			},
		},
		(req, reply) => controller.listForUser(req, reply)
	);
};
