import type { JwtProvider, SignOptions, VerifyOptions } from "@interfaces/http/auth/ports/jwt-provider.js";
import type { FastifyInstance } from "fastify";

/**
 * FastifyJwtProvider: Concrete implementation of JwtProvider using Fastify JWT plugin
 * All Fastify-specific type gymnastics are isolated here
 * JwtTokenService and rest of codebase remain clean and testable
 */
export class FastifyJwtProvider implements JwtProvider {
	constructor(private readonly app: FastifyInstance) {}

	sign(payload: Record<string, unknown>, options: SignOptions): string {
		return this.app.jwt.sign(
			payload as Parameters<FastifyInstance["jwt"]["sign"]>[0],
			options as Parameters<FastifyInstance["jwt"]["sign"]>[1]
		);
	}

	verify(token: string, options?: VerifyOptions): unknown {
		return this.app.jwt.verify(
			token,
			options as Parameters<FastifyInstance["jwt"]["verify"]>[1]
		);
	}
}
