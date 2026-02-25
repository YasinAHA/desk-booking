import type { FastifyReply } from "fastify";

export type RateLimitConfig = {
	max: number;
	timeWindow?: string;
	timeWindowMs?: number;
};

export function applyRateLimit(reply: FastifyReply, config: RateLimitConfig): void {
	reply.rateLimit?.(config);
}

