import type {
	FastifyPluginAsync,
	FastifyInstance,
	FastifyReply,
	FastifyRequest,
	HookHandlerDoneFunction,
} from "fastify";
import fp from "fastify-plugin";

import type { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
import { InvalidTokenError, RevokedTokenError } from "@application/auth/errors/token-errors.js";
import { sendError } from "@interfaces/http/http-errors.js";

function extractBearerToken(req: FastifyRequest): string | null {
    const header = req.headers.authorization;
    if (!header) {
        return null;
    }

    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return null;
    }

    return token;
}

type AuthPluginOptions = {
	authSessionLifecycleService: AuthSessionLifecycleService;
};

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
	app: FastifyInstance,
	options
) => {
	app.decorate(
		"requireAuth",
		(
			req: FastifyRequest,
			reply: FastifyReply,
			done: HookHandlerDoneFunction
		) => {
			void (async () => {
				try {
					const token = extractBearerToken(req);
					if (!token) {
						sendError(reply, 401, "UNAUTHORIZED", "Unauthorized");
						done();
						return;
					}

					const payload = await options.authSessionLifecycleService.verifyAccessToken(token);
					req.user = {
						id: payload.id,
						email: payload.email,
						firstName: payload.firstName,
						lastName: payload.lastName,
						secondLastName: payload.secondLastName,
					};
					done();
				} catch (err) {
					if (err instanceof InvalidTokenError || err instanceof RevokedTokenError) {
						sendError(reply, 401, "UNAUTHORIZED", "Unauthorized");
					} else {
						req.log.error({ err, event: "auth.require_auth_failed" }, "Auth guard failed");
						sendError(reply, 500, "INTERNAL_ERROR", "Unexpected error");
					}
					done();
				}
			})();
		}
	);
};

export const registerAuthPlugin = fp<AuthPluginOptions>(authPlugin, {
    name: "auth",
});
