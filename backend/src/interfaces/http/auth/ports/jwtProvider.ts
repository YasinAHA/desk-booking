/**
 * JwtProvider Port: Abstraction for JWT signing and verification
 * Decouples JWT token service from specific JWT implementation (Fastify, jsonwebtoken, etc)
 * Follows Dependency Inversion Principle - depend on abstraction, not concrete implementation
 */
export interface SignOptions {
	expiresIn?: string | number;
	issuer?: string;
	audience?: string;
	secret?: string;
}

export interface VerifyOptions {
	issuer?: string;
	audience?: string;
	secret?: string;
}

export interface JwtProvider {
	/**
	 * Sign and return a JWT token
	 * @param payload Object to encode in token
	 * @param options Signing options (expiresIn, issuer, audience, custom secret)
	 * @returns Signed JWT string
	 */
	sign(payload: Record<string, unknown>, options: SignOptions): string;

	/**
	 * Verify and decode a JWT token
	 * @param token JWT token string to verify
	 * @param options Verification options (issuer, audience, custom secret)
	 * @returns Decoded payload as object
	 * @throws If token is invalid or verification fails
	 */
	verify(token: string, options?: VerifyOptions): Record<string, unknown>;
}
