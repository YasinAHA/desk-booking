import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { sendError } from "../../lib/httpErrors.js";
import { getDesksForDate } from "./desks.service.js";

const querySchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const desksRoutes: FastifyPluginAsync = async app => {
	app.get(
		"/",
		{
			preHandler: (req, reply, done) => {
				app.requireAuth(req, reply, done);
			},
		},
		async (req, reply) => {
			const parse = querySchema.safeParse(req.query);
			if (!parse.success) {
				return sendError(reply, 400, "BAD_REQUEST", "Invalid date");
			}

			const userId = req.user.id;
			const desks = await getDesksForDate(app, parse.data.date, userId);

			return reply.send({
				date: parse.data.date,
				items: desks,
			});
		}
	);
};
