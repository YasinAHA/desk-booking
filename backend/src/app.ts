import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

import { ZodError } from "zod";

import { env } from "@config/env.js";
import { authRoutes } from "@interfaces/http/auth/auth.routes.js";
import { desksRoutes } from "@interfaces/http/desks/desks.routes.js";
import { isHttpError, sendError } from "@interfaces/http/http-errors.js";
import { recordRequest } from "@interfaces/http/metrics/metrics.js";
import { metricsRoutes } from "@interfaces/http/metrics/metrics.routes.js";
import { registerAuthPlugin } from "@interfaces/http/plugins/auth.js";
import { registerDbPlugin } from "@interfaces/http/plugins/db.js";
import { GLOBAL_RATE_LIMIT } from "@interfaces/http/policies/rate-limit-policies.js";
import { reservationsRoutes } from "@interfaces/http/reservations/reservations.routes.js";

type RequestWithUnknownBody = FastifyRequest & {
	body: unknown;
};

function tryParseBody(body: unknown): unknown {
	if (typeof body !== "string" || body.length === 0) {
		return body;
	}

	try {
		return JSON.parse(body);
	} catch {
		return body;
	}
}

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
        const routePath =
            (req as { routeOptions?: { url?: string } }).routeOptions?.url ??
            req.url.split("?")[0] ?? "";
        recordRequest({
            method: req.method,
            route: routePath,
            statusCode: reply.statusCode,
            durationMs,
        });
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

    // --- Ensure body is always parsed (handle cases where it might be a string) ---
    app.addHook("preValidation", (req, _reply, done) => {
        const parsedBody = tryParseBody(req.body);
        (req as RequestWithUnknownBody).body = parsedBody;
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
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
    });

    // --- Rate limit (global) ---
    await app.register(rateLimit, GLOBAL_RATE_LIMIT);

    // --- Security headers (helmet) ---
    await app.register(helmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:"],
            },
        },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
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
        if (isHttpError(err)) {
            return sendError(reply, err.statusCode, err.code, err.message);
        }

        app.log.error(err);
        return sendError(reply, 500, "INTERNAL_ERROR", "Unexpected error");
    });

    // --- Routes ---
    await app.register(authRoutes, { prefix: "/auth" });
    await app.register(desksRoutes, { prefix: "/desks" });
    await app.register(reservationsRoutes, { prefix: "/reservations" });
    await app.register(metricsRoutes, { prefix: "/metrics" });

    return app;
}
