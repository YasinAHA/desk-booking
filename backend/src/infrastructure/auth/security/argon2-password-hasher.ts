import argon2 from "argon2";

import type { PasswordHasher } from "@application/ports/password-hasher.js";
import {
	createPasswordHash,
	passwordHashToString,
	type PasswordHash,
} from "@domain/value-objects/password-hash.js";

export class Argon2PasswordHasher implements PasswordHasher {
	async hash(plain: string): Promise<PasswordHash> {
		const hash = await argon2.hash(plain);
		return createPasswordHash(hash);
	}

	async verify(hash: PasswordHash, plain: string): Promise<boolean> {
		return argon2.verify(passwordHashToString(hash), plain);
	}
}

