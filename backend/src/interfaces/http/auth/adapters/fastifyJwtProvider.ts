import type { FastifyInstance } from "fastify";
import type { JwtProvider, SignOptions, VerifyOptions } from "../ports/jwtProvider.js";

/**
 * FastifyJwtProvider: Concrete implementation of JwtProvider using Fastify JWT plugin
 * All Fastify-specific type gymnastics (as any) are isolated here
 * JwtTokenService and rest of codebase remain clean and testable
 */
export class FastifyJwtProvider implements JwtProvider {
	constructor(private readonly app: FastifyInstance) {}

	sign(payload: Record<string, unknown>, options: SignOptions): string {
		// Only place where we use `as any` - encapsulated in adapter
		return this.app.jwt.sign(payload as any, options as any);
	}

	verify(token: string, options?: VerifyOptions): Record<string, unknown> {
		// Only place where we use `as any` - encapsulated in adapter
		return this.app.jwt.verify(token, options as any);
	}
}
