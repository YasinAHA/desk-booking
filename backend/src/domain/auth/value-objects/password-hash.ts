import { EmptyPasswordHashError } from "@domain/auth/errors/auth-domain-errors.js";

/**
 * PasswordHash value object - represents a hashed password
 */
export type PasswordHash = string & { readonly __brand: "PasswordHash" };

export function createPasswordHash(value: string): PasswordHash {
	if (!value || value.trim().length === 0) {
		throw new EmptyPasswordHashError();
	}
	return value as PasswordHash;
}

export function passwordHashToString(hash: PasswordHash): string {
	return hash;
}
