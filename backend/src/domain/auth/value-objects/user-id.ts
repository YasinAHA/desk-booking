import { EmptyUserIdError } from "@domain/auth/errors/auth-domain-errors.js";

/**
 * UserId value object - represents a user identifier
 */
export type UserId = string & { readonly __brand: "UserId" };

export function createUserId(value: string): UserId {
	if (!value || value.trim().length === 0) {
		throw new EmptyUserIdError();
	}
	return value as UserId;
}

export function userIdToString(id: UserId): string {
	return id;
}
