import { User } from "@domain/auth/entities/user.js";
import type { Email } from "@domain/auth/value-objects/email.js";
import type { PasswordHash } from "@domain/auth/value-objects/password-hash.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";

// Input DTO for user creation
export type UserCreate = {
	email: Email;
	passwordHash: PasswordHash;
	firstName: string;
	lastName: string;
	secondLastName: string | null;
};

// Auth-specific DTO - only for credential verification
export type UserAuthData = {
	user: User;
	passwordHash: PasswordHash;
};

export interface UserRepository {
	findByEmail(email: Email): Promise<User | null>;
	findAuthData(email: Email): Promise<UserAuthData | null>;
	findById(id: UserId): Promise<User | null>;
	createUser(input: UserCreate): Promise<User>;
	updateCredentials(
		id: UserId,
		passwordHash: PasswordHash,
		firstName: string,
		lastName: string,
		secondLastName: string | null
	): Promise<void>;
	updatePassword(id: UserId, passwordHash: PasswordHash): Promise<void>;
	confirmEmail(id: UserId): Promise<boolean>;
}


