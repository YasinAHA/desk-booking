import type {
	UserAuthData,
	UserCreate,
	UserRepository,
} from "@application/auth/ports/user-repository.js";
import { User } from "@domain/auth/entities/user.js";
import {
	createEmail,
	emailToString,
	type Email,
} from "@domain/auth/value-objects/email.js";
import {
	createPasswordHash,
	passwordHashToString,
	type PasswordHash,
} from "@domain/auth/value-objects/password-hash.js";
import {
	createUserId,
	type UserId,
	userIdToString,
} from "@domain/auth/value-objects/user-id.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

const USER_SELECT_FIELDS =
	"id, email, password_hash, first_name, last_name, second_last_name, confirmed_at";

type UserRow = {
	id: string;
	email: string;
	password_hash: string;
	first_name: string;
	last_name: string;
	second_last_name: string | null;
	confirmed_at: string | Date | null;
};

function parseConfirmedAt(value: string | Date | null): string | null {
	if (value === null) {
		return null;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

function isUserRow(value: unknown): value is UserRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.email === "string" &&
		typeof row.password_hash === "string" &&
		typeof row.first_name === "string" &&
		typeof row.last_name === "string" &&
		(typeof row.second_last_name === "string" || row.second_last_name === null) &&
		(typeof row.confirmed_at === "string" ||
			row.confirmed_at instanceof Date ||
			row.confirmed_at === null)
	);
}

function toUserRow(value: unknown): UserRow | null {
	return isUserRow(value) ? value : null;
}

function mapToDomainUser(row: UserRow): User {
	return new User(
		createUserId(row.id),
		createEmail(row.email),
		row.first_name,
		row.last_name,
		row.second_last_name,
		createPasswordHash(row.password_hash),
		parseConfirmedAt(row.confirmed_at),
	);
}

function mapUserAuthData(row: UserRow): UserAuthData {
	const domainUser = mapToDomainUser(row);
	return {
		user: domainUser,
		passwordHash: createPasswordHash(row.password_hash),
	};
}

export class PgUserRepository implements UserRepository {
	constructor(private readonly db: DbClient) {}

	async findByEmail(email: Email): Promise<User | null> {
		const result = await this.db.query(
			`select ${USER_SELECT_FIELDS} ` +
				"from users where email = $1",
			[emailToString(email)]
		);
		const row = toUserRow(result.rows[0]);
		return row ? mapToDomainUser(row) : null;
	}

	async findAuthData(email: Email): Promise<UserAuthData | null> {
		const result = await this.db.query(
			`select ${USER_SELECT_FIELDS} ` +
				"from users where email = $1",
			[emailToString(email)]
		);
		const row = toUserRow(result.rows[0]);
		return row ? mapUserAuthData(row) : null;
	}

	async findById(id: UserId): Promise<User | null> {
		const result = await this.db.query(
			`select ${USER_SELECT_FIELDS} ` +
				"from users where id = $1",
			[userIdToString(id)]
		);
		const row = toUserRow(result.rows[0]);
		return row ? mapToDomainUser(row) : null;
	}

	async createUser(input: UserCreate): Promise<User> {
		const result = await this.db.query(
			"insert into users (email, password_hash, first_name, last_name, second_last_name) " +
				`values ($1, $2, $3, $4, $5) returning ${USER_SELECT_FIELDS}`,
			[
				emailToString(input.email),
				passwordHashToString(input.passwordHash),
				input.firstName,
				input.lastName,
				input.secondLastName,
			]
		);
		const row = toUserRow(result.rows[0]);
		if (!row) {
			throw new Error("Invalid user insert result");
		}
		return mapToDomainUser(row);
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

	async updatePassword(id: UserId, passwordHash: PasswordHash): Promise<void> {
		await this.db.query(
			"update users set password_hash = $1, token_valid_after = now(), updated_at = now() " +
				"where id = $2",
			[
				passwordHashToString(passwordHash),
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



