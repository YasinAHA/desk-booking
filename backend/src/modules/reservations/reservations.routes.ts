import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { sendError } from "../../lib/httpErrors.js";
import {
    cancelReservation,
    createReservation,
    listMyReservations,
} from "./reservations.service.js";

const createSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	desk_id: z.string().uuid(),
});

const idParamSchema = z.object({
	id: z.string().uuid(),
});

export const reservationsRoutes: FastifyPluginAsync = async app => {
	app.post(
		"/",
		{
			preHandler: (req, reply, done) => {
				app.requireAuth(req, reply, done);
			},
		},
		async (req, reply) => {
			const body =
				typeof req.body === "string"
					? JSON.parse(req.body)
					: req.body;
			const parse = createSchema.safeParse(body);
			if (!parse.success) {
				app.log.warn({ body }, "Invalid reservation payload");
				return sendError(reply, 400, "BAD_REQUEST", "Invalid payload");
			}

			try {
				const reservationId = await createReservation(
					app,
					req.user.id,
					parse.data.date,
					parse.data.desk_id
				);

				return reply.send({
					ok: true,
					reservation_id: reservationId,
				});
			} catch (err) {
				if (err instanceof Error && err.message === "DATE_IN_PAST") {
					return sendError(reply, 400, "DATE_IN_PAST", "Date in past");
				}

				if (typeof err === "object" && err && (err as { code?: string }).code === "23505") {
					return sendError(reply, 409, "CONFLICT", "Reservation conflict");
				}

				throw err;
			}
		}
	);

	app.delete(
		"/:id",
		{
			preHandler: (req, reply, done) => {
				app.requireAuth(req, reply, done);
			},
		},
		async (req, reply) => {
			const parse = idParamSchema.safeParse(req.params);
			if (!parse.success) {
				return sendError(reply, 400, "BAD_REQUEST", "Invalid id");
			}

			const ok = await cancelReservation(app, req.user.id, parse.data.id);
			if (!ok) {
				return sendError(reply, 404, "NOT_FOUND", "Reservation not found");
			}

			return reply.send({ ok: true });
		}
	);

	app.get(
		"/me",
		{
			preHandler: (req, reply, done) => {
				app.requireAuth(req, reply, done);
			},
		},
		async (req, reply) => {
			const items = await listMyReservations(app, req.user.id);
			return reply.send({ items });
		}
	);
};
