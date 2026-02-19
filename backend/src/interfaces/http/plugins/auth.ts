import jwt from "@fastify/jwt";
import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyReply,
    FastifyRequest,
    HookHandlerDoneFunction,
} from "fastify";
import fp from "fastify-plugin";

import { env } from "@config/env.js";
import { sendError } from "@interfaces/http/http-errors.js";

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
            void (async () => {
                try {
                    await req.jwtVerify();

                    const payload = req.user as {
                        id?: string;
                        jti?: string;
                        iat?: number;
                    };

                    if (typeof payload.jti === "string") {
                        const revoked = await app.db.query(
                            "select 1 from token_revocation where jti = $1 limit 1",
                            [payload.jti]
                        );
                        if ((revoked.rowCount ?? 0) > 0) {
                            throw new Error("revoked");
                        }
                    }

                    if (typeof payload.id === "string" && typeof payload.iat === "number") {
                        const userResult = await app.db.query(
                            "select token_valid_after from users where id = $1 limit 1",
                            [payload.id]
                        );
                        const row = userResult.rows[0] as { token_valid_after?: Date | string | null } | undefined;
                        if (row?.token_valid_after) {
                            const tokenValidAfter = new Date(row.token_valid_after);
                            if (!Number.isNaN(tokenValidAfter.getTime())) {
                                const issuedAtMs = payload.iat * 1000;
                                if (issuedAtMs < tokenValidAfter.getTime()) {
                                    throw new Error("token_invalidated");
                                }
                            }
                        }
                    }

                    done();
                } catch {
                    sendError(reply, 401, "UNAUTHORIZED", "Unauthorized");
                    done();
                }
            })();
        }
    );
};

export const registerAuthPlugin = fp(authPlugin, {
    name: "auth",
});
