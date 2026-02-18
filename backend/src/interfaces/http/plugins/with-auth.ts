import type { FastifyInstance } from "fastify";

export function withAuth(app: FastifyInstance) {
	return {
		preHandler: (req: Parameters<FastifyInstance["requireAuth"]>[0], reply: Parameters<FastifyInstance["requireAuth"]>[1], done: Parameters<FastifyInstance["requireAuth"]>[2]) => {
			app.requireAuth(req, reply, done);
		},
	};
}
