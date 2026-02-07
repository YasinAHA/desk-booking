import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { sendError } from "../../lib/httpErrors.js";
import { loginWithPassword } from "./auth.service.js";

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const verifySchema = z.object({
	token: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async app => {
	app.post("/login", async (req, reply) => {
		const parse = loginSchema.safeParse(req.body);
		if (!parse.success) {
			return sendError(reply, 400, "BAD_REQUEST", "Invalid payload");
		}

		const user = await loginWithPassword(
			app,
			parse.data.email.toLowerCase(),
			parse.data.password
		);

		if (!user) {
			return sendError(reply, 401, "INVALID_CREDENTIALS", "Invalid credentials");
		}

		const token = app.jwt.sign({
			id: user.id,
			email: user.email,
			displayName: user.displayName,
		});

		return reply.send({
			token,
			user: {
				id: user.id,
				email: user.email,
				display_name: user.displayName,
			},
		});
	});

	app.post("/verify", async (req, reply) => {
		const parse = verifySchema.safeParse(req.body);
		if (!parse.success) {
			return sendError(reply, 400, "BAD_REQUEST", "Invalid payload");
		}

		try {
			const payload = app.jwt.verify(parse.data.token) as unknown;
			if (!payload || typeof payload !== "object") {
				return sendError(reply, 401, "UNAUTHORIZED", "Invalid token");
			}
			if (
				!("id" in payload) ||
				!("email" in payload) ||
				!("displayName" in payload)
			) {
				return sendError(reply, 401, "UNAUTHORIZED", "Invalid token");
			}

			const typed = payload as {
				id: string;
				email: string;
				displayName: string | null;
			};

			return reply.send({
				valid: true,
				user: {
					id: typed.id,
					email: typed.email,
					display_name: typed.displayName,
				},
			});
		} catch {
			return sendError(reply, 401, "UNAUTHORIZED", "Invalid token");
		}
	});

	app.post("/logout", async (_req, reply) => {
		return reply.status(204).send();
	});
};
