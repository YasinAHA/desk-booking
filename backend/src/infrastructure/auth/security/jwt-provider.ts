/**
 * JwtProvider port for infrastructure security adapters.
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
	sign(payload: Record<string, unknown>, options: SignOptions): Promise<string>;
	verify(token: string, options?: VerifyOptions): Promise<unknown>;
}

