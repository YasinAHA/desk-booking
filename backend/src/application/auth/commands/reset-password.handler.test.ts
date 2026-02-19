import assert from "node:assert/strict";
import test from "node:test";

import { ResetPasswordHandler } from "@application/auth/commands/reset-password.handler.js";
import type { PasswordHasher } from "@application/auth/ports/password-hasher.js";
import type { PasswordResetRepository } from "@application/auth/ports/password-reset-repository.js";
import type { TokenService } from "@application/auth/ports/token-service.js";
import {
	createTransactionalContext,
	type TransactionManager,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import { createPasswordHash } from "@domain/auth/value-objects/password-hash.js";

test("ResetPasswordHandler.execute returns semantic status from repository", async () => {
	const tokenService: TokenService = {
		generate: () => "unused",
		hash: token => `hash:${token}`,
	};
	const passwordHasher: PasswordHasher = {
		hash: async plain => createPasswordHash(`hash:${plain}`),
		verify: async () => false,
	};
	let receivedTokenHash = "";
	const passwordResetRepo: PasswordResetRepository = {
		create: async () => {},
		resetPasswordByTokenHash: async tokenHash => {
			receivedTokenHash = tokenHash;
			return "expired";
		},
	};
	const txManager: TransactionManager = {
		runInTransaction: async <T>(callback: (tx: TransactionalContext) => Promise<T>) => {
			const tx = createTransactionalContext({
				query: async () => ({ rows: [], rowCount: 0 }),
			});
			return callback(tx);
		},
	};

	const handler = new ResetPasswordHandler({
		tokenService,
		passwordHasher,
		txManager,
		passwordResetRepoFactory: () => passwordResetRepo,
	});

	const result = await handler.execute({ token: "raw-token", password: "ValidPass123!" });
	assert.equal(result, "expired");
	assert.equal(receivedTokenHash, "hash:raw-token");
});
