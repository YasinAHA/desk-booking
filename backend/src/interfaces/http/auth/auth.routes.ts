import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { buildAuthHandlers } from "@composition/auth.container.js";
import {
	AUTH_CHANGE_PASSWORD_RATE_LIMIT,
	AUTH_FORGOT_PASSWORD_RATE_LIMIT,
	AUTH_LOGIN_RATE_LIMIT,
	AUTH_REFRESH_RATE_LIMIT,
	AUTH_REGISTER_RATE_LIMIT,
	AUTH_RESET_PASSWORD_RATE_LIMIT,
	AUTH_VERIFY_RATE_LIMIT,
} from "@config/constants.js";
import { withAuth } from "@interfaces/http/plugins/with-auth.js";
import { applyRateLimit, type RateLimitConfig } from "@interfaces/http/rate-limit.js";

import { AuthLoginController } from "./auth-login.controller.js";
import { AuthPasswordController } from "./auth-password.controller.js";
import { AuthRegistrationController } from "./auth-registration.controller.js";

function withRateLimit(
	rateLimitConfig: RateLimitConfig,
	handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>
) {
	return async (req: FastifyRequest, reply: FastifyReply) => {
		applyRateLimit(reply, rateLimitConfig);
		return handler(req, reply);
	};
}

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
		handlers.changePasswordHandler
	);

	app.post(
		"/login",
		withRateLimit(AUTH_LOGIN_RATE_LIMIT, (req, reply) => loginController.login(req, reply))
	);
	app.post(
		"/verify",
		withRateLimit(AUTH_VERIFY_RATE_LIMIT, (req, reply) => loginController.verify(req, reply))
	);
	app.post(
		"/register",
		withRateLimit(AUTH_REGISTER_RATE_LIMIT, (req, reply) =>
			registrationController.register(req, reply)
		)
	);
	app.post(
		"/forgot-password",
		withRateLimit(AUTH_FORGOT_PASSWORD_RATE_LIMIT, (req, reply) =>
			passwordController.forgotPassword(req, reply)
		)
	);
	app.post(
		"/reset-password",
		withRateLimit(AUTH_RESET_PASSWORD_RATE_LIMIT, (req, reply) =>
			passwordController.resetPassword(req, reply)
		)
	);
	app.post(
		"/change-password",
		auth,
		withRateLimit(AUTH_CHANGE_PASSWORD_RATE_LIMIT, (req, reply) =>
			passwordController.changePassword(req, reply)
		)
	);
	app.post(
		"/refresh",
		withRateLimit(AUTH_REFRESH_RATE_LIMIT, (req, reply) => loginController.refresh(req, reply))
	);
	app.get("/confirm", async (req, reply) => registrationController.confirmEmail(req, reply));
	app.post("/logout", auth, async (req, reply) => loginController.logout(req, reply));
};
