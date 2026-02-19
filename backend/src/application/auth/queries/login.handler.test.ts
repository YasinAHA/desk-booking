import assert from "node:assert/strict";
import test from "node:test";

import { LoginHandler } from "@application/auth/queries/login.handler.js";
import type { AuthPolicy } from "@application/auth/ports/auth-policy.js";
import type { PasswordHasher } from "@application/auth/ports/password-hasher.js";
import type { UserRepository } from "@application/auth/ports/user-repository.js";
import { User } from "@domain/auth/entities/user.js";
import { createEmail } from "@domain/auth/value-objects/email.js";
import { createPasswordHash, passwordHashToString } from "@domain/auth/value-objects/password-hash.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

function mockUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
	return {
		findByEmail: async () => null,
		findAuthData: async () => null,
		findById: async () => null,
		createUser: async () => {
			throw new Error("createUser not mocked");
		},
		updateCredentials: async () => {},
		updatePassword: async () => {},
		confirmEmail: async () => false,
		...overrides,
	};
}

function buildPasswordHasher(): PasswordHasher {
	return {
		hash: async plain => createPasswordHash(`hash:${plain}`),
		verify: async (hash, plain) => passwordHashToString(hash) === `hash:${plain}`,
	};
}

function buildAuthPolicy(overrides: Partial<AuthPolicy> = {}): AuthPolicy {
	const basePolicy: AuthPolicy = {
		isAllowedEmail: email => {
			const domain = email.split("@")[1]?.toLowerCase();
			return domain === "camerfirma.com";
		},
		getEmailVerificationTtlMs: () => 60_000,
		getPasswordResetTtlMs: () => 60_000,
	};
	return { ...basePolicy, ...overrides };
}

function buildLoginHandler(
	userRepo: UserRepository,
	overrides?: {
		passwordHasher?: PasswordHasher;
		authPolicy?: AuthPolicy;
	}
): LoginHandler {
	return new LoginHandler({
		authPolicy: overrides?.authPolicy ?? buildAuthPolicy(),
		passwordHasher: overrides?.passwordHasher ?? buildPasswordHasher(),
		userRepo,
	});
}

test("LoginHandler.execute rejects non-allowed domain", async () => {
	let called = false;
	const userRepo = mockUserRepo({
		findByEmail: async () => {
			called = true;
			return null;
		},
	});
	const handler = buildLoginHandler(userRepo);

	const result = await handler.execute({ email: "user@other.com", password: "1234" });
	assert.deepEqual(result, { status: "INVALID_CREDENTIALS" });
	assert.equal(called, false);
});

test("LoginHandler.execute returns null when user not found", async () => {
	const userRepo = mockUserRepo({
		findAuthData: async () => null,
	});
	const handler = buildLoginHandler(userRepo);

	const result = await handler.execute({ email: "admin@camerfirma.com", password: "1234" });
	assert.deepEqual(result, { status: "INVALID_CREDENTIALS" });
});

test("LoginHandler.execute returns NOT_CONFIRMED when user not confirmed", async () => {
	const passwordHasher = buildPasswordHasher();
	const hash = await passwordHasher.hash("1234");
	const unconfirmedUser = new User(
		createUserId("user-1"),
		createEmail("admin@camerfirma.com"),
		"Admin",
		"User",
		null,
		hash,
		null
	);
	const userRepo = mockUserRepo({
		findAuthData: async () => ({
			user: unconfirmedUser,
			passwordHash: hash,
		}),
	});
	const handler = buildLoginHandler(userRepo, { passwordHasher });

	const result = await handler.execute({ email: "admin@camerfirma.com", password: "1234" });
	assert.deepEqual(result, { status: "NOT_CONFIRMED" });
});

test("LoginHandler.execute returns OK when credentials match", async () => {
	const passwordHasher = buildPasswordHasher();
	const hash = await passwordHasher.hash("1234");
	const confirmedUser = new User(
		createUserId("user-1"),
		createEmail("admin@camerfirma.com"),
		"Admin",
		"User",
		null,
		hash,
		"2025-01-01T00:00:00Z"
	);
	const userRepo = mockUserRepo({
		findAuthData: async () => ({
			user: confirmedUser,
			passwordHash: hash,
		}),
	});
	const handler = buildLoginHandler(userRepo, { passwordHasher });

	const result = await handler.execute({ email: "admin@camerfirma.com", password: "1234" });
	assert.deepEqual(result, {
		status: "OK",
		user: {
			id: "user-1",
			email: "admin@camerfirma.com",
			firstName: "Admin",
			lastName: "User",
			secondLastName: null,
		},
	});
});
