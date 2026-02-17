import type { PasswordHash } from "@domain/value-objects/password-hash.js";

export interface PasswordHasher {
	hash(plain: string): Promise<PasswordHash>;
	verify(hash: PasswordHash, plain: string): Promise<boolean>;
}

