/**
 * PasswordHash value object - represents a hashed password
 */
export type PasswordHash = string & { readonly __brand: "PasswordHash" };

export function createPasswordHash(value: string): PasswordHash {
	if (!value || value.trim().length === 0) {
		throw new Error("PasswordHash cannot be empty");
	}
	return value as PasswordHash;
}

export function passwordHashToString(hash: PasswordHash): string {
	return hash;
}
