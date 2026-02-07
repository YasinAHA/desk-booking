import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { ZodError } from "zod";

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
        logger: true,
    });

    // --- CORS (ajusta origin cuando haya frontend real) ---
    await app.register(cors, {
        origin: true,
        credentials: true,
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
