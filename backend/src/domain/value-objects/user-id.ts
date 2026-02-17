/**
 * UserId value object - represents a user identifier
 */
export type UserId = string & { readonly __brand: "UserId" };

export function createUserId(value: string): UserId {
	if (!value || value.trim().length === 0) {
		throw new Error("UserId cannot be empty");
	}
	return value as UserId;
}

export function userIdToString(id: UserId): string {
	return id;
}
