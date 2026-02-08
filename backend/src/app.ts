import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

import { ZodError } from "zod";

import { env } from "./config/env.js";
import { sendError } from "./lib/httpErrors.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { desksRoutes } from "./modules/desks/desks.routes.js";
import { reservationsRoutes } from "./modules/reservations/reservations.routes.js";
import { registerAuthPlugin } from "./plugins/auth.js";
import { registerDbPlugin } from "./plugins/db.js";

// Si ya tienes estos plugins/rutas creados, descomenta e integra.
// import { registerSwaggerPlugin } from "./plugins/swagger.js";
// import { registerAuthPlugin } from "./plugins/auth.js";
// import { authRoutes } from "./modules/auth/auth.routes.js";
// import { desksRoutes } from "./modules/desks/desks.routes.js";
// import { reservationsRoutes } from "./modules/reservations/reservations.routes.js";

export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: env.NODE_ENV !== "test",
        genReqId: () => randomUUID(),
    });

    app.addHook("onRequest", (req, reply, done) => {
        (req as { startTime?: number }).startTime = Date.now();
        reply.header("x-request-id", req.id);
        req.log.info(
            { event: "request.start", method: req.method, url: req.url },
            "Request started"
        );
        done();
    });

    app.addHook("onResponse", (req, reply, done) => {
        const startTime = (req as { startTime?: number }).startTime ?? Date.now();
        const durationMs = Date.now() - startTime;
        req.log.info(
            {
                event: "request.end",
                statusCode: reply.statusCode,
                duration_ms: durationMs,
            },
            "Request completed"
        );
        done();
    });

    // --- CORS (ajusta origin cuando haya frontend real) ---
    await app.register(cors, {
        origin: (origin, cb) => {
            if (!origin) {
                cb(null, true);
                return;
            }

            if (env.CORS_ORIGINS.length === 0) {
                cb(new Error("CORS origin not allowed"), false);
                return;
            }

            const allowed = env.CORS_ORIGINS.includes(origin);
            cb(allowed ? null : new Error("CORS origin not allowed"), allowed);
        },
        credentials: true,
    });

    // --- Rate limit (global) ---
    await app.register(rateLimit, {
        max: 100,
        timeWindow: "1 minute",
    });

    // --- Healthcheck ---
    app.get("/health", async () => {
        return { ok: true };
    });

    // --- DB ---
    await app.register(registerDbPlugin);

    // --- Auth ---
    await app.register(registerAuthPlugin);

    // --- Error handler ---
    app.setErrorHandler((err, _req, reply) => {
        if (err instanceof ZodError) {
            return sendError(reply, 400, "BAD_REQUEST", "Invalid payload");
        }

        app.log.error(err);
        return sendError(reply, 500, "INTERNAL_ERROR", "Unexpected error");
    });

    // --- Routes ---
    await app.register(authRoutes, { prefix: "/auth" });
    await app.register(desksRoutes, { prefix: "/desks" });
    await app.register(reservationsRoutes, { prefix: "/reservations" });

    return app;
}
