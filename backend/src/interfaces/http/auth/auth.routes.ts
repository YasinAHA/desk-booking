import type { FastifyPluginAsync } from "fastify";

import { buildAuthHandlers, buildJwtTokenService } from "@composition/auth.container.js";
import { AuthController } from "./auth.controller.js";

export const authRoutes: FastifyPluginAsync = async app => {
	const handlers = buildAuthHandlers(app);
	const jwtTokenService = buildJwtTokenService(app);
	const controller = new AuthController(
		handlers.loginHandler,
		handlers.registerHandler,
		handlers.confirmEmailHandler,
		jwtTokenService
	);

	app.post("/login", async (req, reply) => controller.login(req, reply));
	app.post("/verify", async (req, reply) => controller.verify(req, reply));
	app.post("/register", async (req, reply) => controller.register(req, reply));
	app.post("/refresh", async (req, reply) => controller.refresh(req, reply));
	app.get("/confirm", async (req, reply) => controller.confirmEmail(req, reply));
	app.post("/logout", async (req, reply) => controller.logout(req, reply));
};
