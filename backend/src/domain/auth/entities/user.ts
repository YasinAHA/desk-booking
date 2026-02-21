import type { Email } from "@domain/auth/value-objects/email.js";
import type { PasswordHash } from "@domain/auth/value-objects/password-hash.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";

export class InvalidUserProfileError extends Error {
	constructor(field: "firstName" | "lastName") {
		super(`Invalid user profile field: ${field}`);
		this.name = "InvalidUserProfileError";
	}
}

export type UserProfileInput = {
	firstName: string;
	lastName: string;
	secondLastName: string | null;
};

function normalizeRequiredName(
	value: string,
	field: "firstName" | "lastName"
): string {
	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new InvalidUserProfileError(field);
	}
	return normalized;
}

function normalizeOptionalName(value: string | null): string | null {
	if (value === null) {
		return null;
	}
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

/**
 * Domain entity for User
 * Contains business logic and invariants
 * Immutable: methods return new instances
 */
export class User {
	constructor(
		readonly id: UserId,
		readonly email: Email,
		readonly firstName: string,
		readonly lastName: string,
		readonly secondLastName: string | null,
		readonly passwordHash: PasswordHash,
		readonly confirmedAt: string | null,
	) {}

	static normalizeProfile(input: UserProfileInput): UserProfileInput {
		return {
			firstName: normalizeRequiredName(input.firstName, "firstName"),
			lastName: normalizeRequiredName(input.lastName, "lastName"),
			secondLastName: normalizeOptionalName(input.secondLastName),
		};
	}

	/**
	 * Check if email is confirmed
	 */
	isConfirmed(): boolean {
		return this.confirmedAt !== null;
	}

	/**
	 * Mark email as confirmed at given timestamp
	 * Returns new User instance (immutable pattern)
	 */
	confirmEmail(confirmedAt: string): User {
		if (this.isConfirmed()) {
			throw new Error("Email is already confirmed");
		}
		return new User(
			this.id,
			this.email,
			this.firstName,
			this.lastName,
			this.secondLastName,
			this.passwordHash,
			confirmedAt
		);
	}

	changePassword(newPasswordHash: PasswordHash): User {
		return new User(
			this.id,
			this.email,
			this.firstName,
			this.lastName,
			this.secondLastName,
			newPasswordHash,
			this.confirmedAt,
		);
	}

	/**
	 * Update credentials (password and/or display name)
	 * Returns new User instance
	 */
	updateCredentials(
		newPasswordHash: PasswordHash,
		newFirstName: string,
		newLastName: string,
		newSecondLastName: string | null,
	): User {
		const normalizedProfile = User.normalizeProfile({
			firstName: newFirstName,
			lastName: newLastName,
			secondLastName: newSecondLastName,
		});

		return new User(
			this.id,
			this.email,
			normalizedProfile.firstName,
			normalizedProfile.lastName,
			normalizedProfile.secondLastName,
			newPasswordHash,
			this.confirmedAt,
		);
	}

	/**
	 * Check if password matches current hash
	 * Note: actual verification is delegated to PasswordHasher port
	 * This method just checks that passwordHash exists
	 */
	hasPasswordHash(): boolean {
		return !!this.passwordHash;
	}
}
