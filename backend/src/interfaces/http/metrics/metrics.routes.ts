import type { FastifyPluginAsync } from "fastify";

import { getMetricsSnapshot } from "./metrics.js";

/**
 * Metrics endpoint - Protected by authentication
 * Requires valid JWT token to access
 */
export const metricsRoutes: FastifyPluginAsync = async app => {
	app.get(
		"/",
		{
			preHandler: (req, reply, done) => {
				// Require authentication to access metrics
				app.requireAuth(req, reply, done);
			},
		},
		async () => {
			return getMetricsSnapshot();
		}
	);
};
