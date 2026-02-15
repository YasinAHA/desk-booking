import { User } from "../../domain/entities/user.js";
import type { Email } from "../../domain/valueObjects/email.js";
import type { PasswordHash } from "../../domain/valueObjects/passwordHash.js";
import type { UserId } from "../../domain/valueObjects/userId.js";

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
	confirmEmail(id: UserId): Promise<boolean>;
}
