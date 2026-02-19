import type { FastifyPluginAsync } from "fastify";

import { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
import { buildAuthHandlers, buildJwtTokenService } from "@composition/auth.container.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { AuthController } from "./auth.controller.js";

export const authRoutes: FastifyPluginAsync = async app => {
	const handlers = buildAuthHandlers(app);
	const jwtTokenService = buildJwtTokenService(app);
	const authSessionLifecycleService = new AuthSessionLifecycleService(jwtTokenService);
	const auth = withAuth(app);
	const controller = new AuthController(
		handlers.loginHandler,
		handlers.registerHandler,
		handlers.confirmEmailHandler,
		handlers.forgotPasswordHandler,
		handlers.resetPasswordHandler,
		handlers.changePasswordHandler,
		authSessionLifecycleService
	);

	app.post("/login", async (req, reply) => controller.login(req, reply));
	app.post("/verify", async (req, reply) => controller.verify(req, reply));
	app.post("/register", async (req, reply) => controller.register(req, reply));
	app.post("/forgot-password", async (req, reply) => controller.forgotPassword(req, reply));
	app.post("/reset-password", async (req, reply) => controller.resetPassword(req, reply));
	app.post("/change-password", auth, async (req, reply) => controller.changePassword(req, reply));
	app.post("/refresh", async (req, reply) => controller.refresh(req, reply));
	app.get("/confirm", async (req, reply) => controller.confirmEmail(req, reply));
	app.post("/logout", async (req, reply) => controller.logout(req, reply));
};
