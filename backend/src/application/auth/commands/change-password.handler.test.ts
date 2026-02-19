import assert from "node:assert/strict";
import test from "node:test";

import { ChangePasswordHandler } from "@application/auth/commands/change-password.handler.js";
import type { PasswordHasher } from "@application/auth/ports/password-hasher.js";
import type { UserRepository } from "@application/auth/ports/user-repository.js";
import {
	createTransactionalContext,
	type TransactionManager,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import { User } from "@domain/auth/entities/user.js";
import { createEmail } from "@domain/auth/value-objects/email.js";
import { createPasswordHash, passwordHashToString } from "@domain/auth/value-objects/password-hash.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

function buildUserRepo(overrides: Partial<UserRepository>): UserRepository {
	return {
		findByEmail: async () => null,
		findAuthData: async () => null,
		findById: async () => null,
		createUser: async () => {
			throw new Error("not used");
		},
		updateCredentials: async () => {},
		updatePassword: async () => {},
		confirmEmail: async () => false,
		...overrides,
	};
}

test("ChangePasswordHandler.execute returns INVALID_CREDENTIALS when current password is wrong", async () => {
	const user = new User(
		createUserId("user-1"),
		createEmail("user@camerfirma.com"),
		"User",
		"Test",
		null,
		createPasswordHash("hash:old"),
		"2026-01-01T00:00:00.000Z"
	);
	const userRepo = buildUserRepo({
		findById: async () => user,
	});
	const passwordHasher: PasswordHasher = {
		hash: async plain => createPasswordHash(`hash:${plain}`),
		verify: async () => false,
	};
	const txManager: TransactionManager = {
		runInTransaction: async <T>(callback: (tx: TransactionalContext) => Promise<T>) => {
			const tx = createTransactionalContext({
				query: async () => ({ rows: [], rowCount: 0 }),
			});
			return callback(tx);
		},
	};

	const handler = new ChangePasswordHandler({
		passwordHasher,
		txManager,
		userRepo,
		userRepoFactory: () => userRepo,
	});

	const result = await handler.execute({
		userId: "user-1",
		currentPassword: "wrong-pass",
		newPassword: "ValidPass123!",
	});

	assert.deepEqual(result, { status: "INVALID_CREDENTIALS" });
});

test("ChangePasswordHandler.execute updates password when current password is valid", async () => {
	let updated = false;
	const user = new User(
		createUserId("user-1"),
		createEmail("user@camerfirma.com"),
		"User",
		"Test",
		null,
		createPasswordHash("hash:old"),
		"2026-01-01T00:00:00.000Z"
	);
	const userRepo = buildUserRepo({
		findById: async () => user,
		updatePassword: async (_id, hash) => {
			updated = passwordHashToString(hash) === "hash:ValidPass123!";
		},
	});
	const passwordHasher: PasswordHasher = {
		hash: async plain => createPasswordHash(`hash:${plain}`),
		verify: async (hash, plain) => passwordHashToString(hash) === `hash:${plain}`,
	};
	const txManager: TransactionManager = {
		runInTransaction: async <T>(callback: (tx: TransactionalContext) => Promise<T>) => {
			const tx = createTransactionalContext({
				query: async () => ({ rows: [], rowCount: 0 }),
			});
			return callback(tx);
		},
	};

	const handler = new ChangePasswordHandler({
		passwordHasher,
		txManager,
		userRepo,
		userRepoFactory: () => userRepo,
	});

	const result = await handler.execute({
		userId: "user-1",
		currentPassword: "old",
		newPassword: "ValidPass123!",
	});

	assert.deepEqual(result, { status: "OK" });
	assert.equal(updated, true);
});
