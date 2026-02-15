import type { PasswordHash } from "../../domain/valueObjects/passwordHash.js";

export interface PasswordHasher {
	hash(plain: string): Promise<PasswordHash>;
	verify(hash: PasswordHash, plain: string): Promise<boolean>;
}
