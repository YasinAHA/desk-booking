import type { Email } from "@domain/value-objects/email.js";
import type { PasswordHash } from "@domain/value-objects/password-hash.js";
import type { UserId } from "@domain/value-objects/user-id.js";

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
		return new User(
			this.id,
			this.email,
			newFirstName,
			newLastName,
			newSecondLastName,
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

