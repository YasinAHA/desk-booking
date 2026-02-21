import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyReply,
    FastifyRequest,
    HookHandlerDoneFunction,
} from "fastify";
import fp from "fastify-plugin";

import { env } from "@config/env.js";
import { JoseJwtProvider } from "@interfaces/http/auth/adapters/jose-jwt-provider.js";
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

const authPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    const jwtProvider = new JoseJwtProvider(env.JWT_SECRET, env.JWT_REFRESH_SECRET);

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
                        throw new Error("missing_bearer_token");
                    }

                    const payload = await jwtProvider.verify(token);
                    if (
                        typeof payload !== "object" ||
                        payload === null ||
                        (payload as { type?: string }).type !== "access"
                    ) {
                        throw new Error("invalid_token_type");
                    }

                    const tokenPayload = payload as {
                        id?: string;
                        email?: string;
                        firstName?: string;
                        lastName?: string;
                        secondLastName?: string | null;
                        jti?: string;
                        iat?: number;
                    };

                    if (
                        typeof tokenPayload.id !== "string" ||
                        typeof tokenPayload.email !== "string" ||
                        typeof tokenPayload.firstName !== "string" ||
                        typeof tokenPayload.lastName !== "string" ||
                        (tokenPayload.secondLastName !== null &&
                            typeof tokenPayload.secondLastName !== "string")
                    ) {
                        throw new Error("invalid_token_payload");
                    }

                    const authenticatedUser = {
                        id: tokenPayload.id,
                        email: tokenPayload.email,
                        firstName: tokenPayload.firstName,
                        lastName: tokenPayload.lastName,
                        secondLastName: tokenPayload.secondLastName,
                        ...(typeof tokenPayload.jti === "string" ? { jti: tokenPayload.jti } : {}),
                        ...(typeof tokenPayload.iat === "number" ? { iat: tokenPayload.iat } : {}),
                    };

                    if (typeof tokenPayload.jti === "string") {
                        const revoked = await app.db.query(
                            "select 1 from token_revocation where jti = $1 limit 1",
                            [tokenPayload.jti]
                        );
                        if ((revoked.rowCount ?? 0) > 0) {
                            throw new Error("revoked");
                        }
                    }

                    if (typeof tokenPayload.iat === "number") {
                        const userResult = await app.db.query(
                            "select token_valid_after from users where id = $1 limit 1",
                            [tokenPayload.id]
                        );
                        const row = userResult.rows[0] as { token_valid_after?: Date | string | null } | undefined;
                        if (row?.token_valid_after) {
                            const tokenValidAfter = new Date(row.token_valid_after);
                            if (!Number.isNaN(tokenValidAfter.getTime())) {
                                const issuedAtMs = tokenPayload.iat * 1000;
                                if (issuedAtMs < tokenValidAfter.getTime()) {
                                    throw new Error("token_invalidated");
                                }
                            }
                        }
                    }

                    req.user = authenticatedUser;
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
