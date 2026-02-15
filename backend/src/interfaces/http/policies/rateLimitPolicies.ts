import type { FastifyInstance } from "fastify";

/**
 * Rate limiting policies for application endpoints
 * Centralized configuration for consistent security controls
 */

export const GLOBAL_RATE_LIMIT = {
	max: 100,
	timeWindow: "1 minute",
} as const;

export const AUTH_LOGIN_RATE_LIMIT = {
	max: 10,
	timeWindow: "1 minute",
} as const;

export const AUTH_VERIFY_RATE_LIMIT = {
	max: 20,
	timeWindow: "1 minute",
} as const;

export const AUTH_REGISTER_RATE_LIMIT = {
	max: 5,
	timeWindow: "10 minutes",
} as const;

/**
 * Register route-specific rate limits
 * @param app Fastify instance
 * @param routes Array of route definitions with limits
 */
export async function registerRatePolicies(
	app: FastifyInstance,
	routes: Array<{ path: string; max: number; timeWindow: string }>
) {
	for (const route of routes) {
		app.register(
			(await import("@fastify/rate-limit")).default,
			{
				max: route.max,
				timeWindow: route.timeWindow,
				cache: 10000,
				allowList: ["127.0.0.1"],
				redis: undefined,
				skipOnError: false,
				prefix: route.path,
			}
		);
	}
}
