import type { PasswordHash } from "@domain/auth/value-objects/password-hash.js";

export interface PasswordHasher {
	hash(plain: string): Promise<PasswordHash>;
	verify(hash: PasswordHash, plain: string): Promise<boolean>;
}


