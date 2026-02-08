import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { env } from "../../config/env.js";
import { sendError } from "../../lib/httpErrors.js";
import { sendEmail } from "../../lib/mailer.js";
import { confirmEmail, loginWithPassword, registerUser } from "./auth.service.js";

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const verifySchema = z.object({
	token: z.string().min(1),
});

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
	display_name: z.string().min(1).optional(),
});

export const authRoutes: FastifyPluginAsync = async app => {
	app.post("/login", async (req, reply) => {
		if (reply.rateLimit) {
			reply.rateLimit({ max: 10, timeWindow: "1 minute" });
		}
		const parse = loginSchema.safeParse(req.body);
		if (!parse.success) {
			return sendError(reply, 400, "BAD_REQUEST", "Invalid payload");
		}

		const result = await loginWithPassword(
			app,
			parse.data.email.toLowerCase(),
			parse.data.password
		);

		if (!result) {
			return sendError(reply, 401, "INVALID_CREDENTIALS", "Invalid credentials");
		}
		if (result.status === "NOT_CONFIRMED") {
			return sendError(reply, 403, "NOT_CONFIRMED", "Email not confirmed");
		}

		const user = result.user;

		const token = app.jwt.sign({
			id: user.id,
			email: user.email,
			displayName: user.displayName,
		});

		req.log.info({ event: "auth.login", userId: user.id }, "Login ok");

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
		if (reply.rateLimit) {
			reply.rateLimit({ max: 20, timeWindow: "1 minute" });
		}
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

	app.post("/register", async (req, reply) => {
		if (reply.rateLimit) {
			reply.rateLimit({ max: 5, timeWindow: "10 minutes" });
		}
		const parse = registerSchema.safeParse(req.body);
		if (!parse.success) {
			return sendError(reply, 400, "BAD_REQUEST", "Invalid payload");
		}

		const result = await registerUser(
			app,
			parse.data.email.toLowerCase(),
			parse.data.password,
			parse.data.display_name
		);

		if (result.status === "DOMAIN_NOT_ALLOWED") {
			return sendError(reply, 403, "DOMAIN_NOT_ALLOWED", "Email not allowed");
		}

		if (result.status === "ALREADY_CONFIRMED") {
			return sendError(reply, 409, "EMAIL_EXISTS", "Email already registered");
		}

		const confirmUrl = `${env.APP_BASE_URL}/auth/confirm?token=${result.token}`;
		await sendEmail({
			to: parse.data.email,
			subject: "Confirm your Desk Booking account",
			html: `<p>Confirm your account:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
			text: `Confirm your account: ${confirmUrl}`,
		});

		const emailDomain = parse.data.email.split("@")[1]?.toLowerCase() ?? "unknown";
		req.log.info(
			{ event: "auth.register", email_domain: emailDomain },
			"Registration requested"
		);

		return reply.send({ ok: true });
	});

	app.get("/confirm", async (req, reply) => {
		const token = (req.query as { token?: string }).token;
		if (!token) {
			return sendError(reply, 400, "BAD_REQUEST", "Missing token");
		}

		const ok = await confirmEmail(app, token);
		if (!ok) {
			return sendError(reply, 400, "INVALID_TOKEN", "Invalid or expired token");
		}

		req.log.info({ event: "auth.confirm" }, "Email confirmed");

		return reply.send({ ok: true });
	});

	app.post("/logout", async (_req, reply) => {
		return reply.status(204).send();
	});
};
