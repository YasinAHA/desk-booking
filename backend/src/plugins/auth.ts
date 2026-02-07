import jwt from "@fastify/jwt";
import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyReply,
    FastifyRequest,
    HookHandlerDoneFunction,
} from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env.js";
import { sendError } from "../lib/httpErrors.js";

const authPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    await app.register(jwt, {
        secret: env.JWT_SECRET,
    });

    app.decorate(
        "requireAuth",
        (
            req: FastifyRequest,
            reply: FastifyReply,
            done: HookHandlerDoneFunction
        ) => {
            req
                .jwtVerify()
                .then(() => done())
                .catch(() => {
                    sendError(reply, 401, "UNAUTHORIZED", "Unauthorized");
                    done();
                });
        }
    );
};

export const registerAuthPlugin = fp(authPlugin, {
    name: "auth",
});
