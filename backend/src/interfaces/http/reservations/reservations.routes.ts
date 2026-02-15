import type { FastifyPluginAsync } from "fastify";

import { buildReservationUseCase } from "./reservations.container.js";
import { ReservationController } from "./reservations.controller.js";

export const reservationsRoutes: FastifyPluginAsync = async app => {
	const reservationUseCase = buildReservationUseCase(app);
	const controller = new ReservationController(reservationUseCase, app);

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
