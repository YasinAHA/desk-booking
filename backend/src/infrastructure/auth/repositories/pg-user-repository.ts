import type {
	UserAuthData,
	UserCreate,
	UserRepository,
} from "@application/ports/user-repository.js";
import { User } from "@domain/entities/user.js";
import {
	createEmail,
	emailToString,
	type Email,
} from "@domain/value-objects/email.js";
import {
	createPasswordHash,
	passwordHashToString,
	type PasswordHash,
} from "@domain/value-objects/password-hash.js";
import {
	createUserId,
	type UserId,
	userIdToString,
} from "@domain/value-objects/user-id.js";

type DbQuery = (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number }>;

type DbClient = {
	query: DbQuery;
};

function mapToDomainUser(row: any): User {
	return new User(
		createUserId(row.id),
		createEmail(row.email),
		row.first_name,
		row.last_name,
		row.second_last_name,
		createPasswordHash(row.password_hash),
		row.confirmed_at,
	);
}

function mapUserAuthData(row: any): UserAuthData {
	const domainUser = new User(
		createUserId(row.id),
		createEmail(row.email),
		row.first_name,
		row.last_name,
		row.second_last_name,
		createPasswordHash(row.password_hash),
		row.confirmed_at,
	);
	return {
		user: domainUser,
		passwordHash: createPasswordHash(row.password_hash),
	};
}

export class PgUserRepository implements UserRepository {
	constructor(private readonly db: DbClient) {}

	async findByEmail(email: Email): Promise<User | null> {
		const result = await this.db.query(
			"select id, email, password_hash, first_name, last_name, second_last_name, confirmed_at " +
				"from users where email = $1",
			[emailToString(email)]
		);
		const row = result.rows[0];
		return row ? mapToDomainUser(row) : null;
	}

	async findAuthData(email: Email): Promise<UserAuthData | null> {
		const result = await this.db.query(
			"select id, email, password_hash, first_name, last_name, second_last_name, confirmed_at " +
				"from users where email = $1",
			[emailToString(email)]
		);
		const row = result.rows[0];
		return row ? mapUserAuthData(row) : null;
	}

	async findById(id: UserId): Promise<User | null> {
		const result = await this.db.query(
			"select id, email, password_hash, first_name, last_name, second_last_name, confirmed_at " +
				"from users where id = $1",
			[userIdToString(id)]
		);
		const row = result.rows[0];
		return row ? mapToDomainUser(row) : null;
	}

	async createUser(input: UserCreate): Promise<User> {
		const result = await this.db.query(
			"insert into users (email, password_hash, first_name, last_name, second_last_name) " +
				"values ($1, $2, $3, $4, $5) returning id, email, password_hash, first_name, last_name, second_last_name, confirmed_at",
			[
				emailToString(input.email),
				passwordHashToString(input.passwordHash),
				input.firstName,
				input.lastName,
				input.secondLastName,
			]
		);
		return mapToDomainUser(result.rows[0]);
	}

	async updateCredentials(
		id: UserId,
		passwordHash: PasswordHash,
		firstName: string,
		lastName: string,
		secondLastName: string | null
	): Promise<void> {
		await this.db.query(
			"update users set password_hash = $1, first_name = $2, last_name = $3, second_last_name = $4, updated_at = now() " +
				"where id = $5",
			[
				passwordHashToString(passwordHash),
				firstName,
				lastName,
				secondLastName,
				userIdToString(id),
			]
		);
	}

	async confirmEmail(id: UserId): Promise<boolean> {
		const result = await this.db.query(
			"update users set confirmed_at = now() " +
				"where id = $1 and confirmed_at is null",
			[userIdToString(id)]
		);
		return (result.rowCount ?? 0) > 0;
	}
}

