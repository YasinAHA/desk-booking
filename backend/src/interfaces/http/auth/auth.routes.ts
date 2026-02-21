import type { FastifyPluginAsync } from "fastify";

import { buildAuthHandlers } from "@composition/auth.container.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";

import { AuthLoginController } from "./auth-login.controller.js";
import { AuthPasswordController } from "./auth-password.controller.js";
import { AuthRegistrationController } from "./auth-registration.controller.js";

export const authRoutes: FastifyPluginAsync = async app => {
	const handlers = buildAuthHandlers(app);
	const auth = withAuth(app);

	const loginController = new AuthLoginController(
		handlers.loginHandler,
		app.authSessionLifecycleService,
		handlers.verifyTokenHandler,
		handlers.refreshSessionHandler,
		handlers.logoutHandler
	);
	const registrationController = new AuthRegistrationController(
		handlers.registerHandler,
		handlers.confirmEmailHandler
	);
	const passwordController = new AuthPasswordController(
		handlers.forgotPasswordHandler,
		handlers.resetPasswordHandler,
		handlers.changePasswordHandler,
		handlers.recoveryAttemptPolicyService
	);

	app.post("/login", async (req, reply) => loginController.login(req, reply));
	app.post("/verify", async (req, reply) => loginController.verify(req, reply));
	app.post("/register", async (req, reply) => registrationController.register(req, reply));
	app.post("/forgot-password", async (req, reply) => passwordController.forgotPassword(req, reply));
	app.post("/reset-password", async (req, reply) => passwordController.resetPassword(req, reply));
	app.post("/change-password", auth, async (req, reply) => passwordController.changePassword(req, reply));
	app.post("/refresh", async (req, reply) => loginController.refresh(req, reply));
	app.get("/confirm", async (req, reply) => registrationController.confirmEmail(req, reply));
	app.post("/logout", auth, async (req, reply) => loginController.logout(req, reply));
};

