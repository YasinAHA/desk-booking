import assert from "node:assert/strict";
import test from "node:test";

import { ResetPasswordHandler } from "@application/auth/commands/reset-password.handler.js";
import type { PasswordHasher } from "@application/auth/ports/password-hasher.js";
import type { PasswordResetRepository } from "@application/auth/ports/password-reset-repository.js";
import type { TokenService } from "@application/auth/ports/token-service.js";
import { RecoveryAttemptPolicyService } from "@application/auth/services/recovery-attempt-policy.service.js";
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
	const recoveryAttemptPolicyService = new RecoveryAttemptPolicyService(tokenService, {
		forgotPasswordIdentifier: { max: 10, timeWindowMs: 60_000 },
		resetPasswordIdentifier: { max: 10, timeWindowMs: 60_000 },
	});

	const handler = new ResetPasswordHandler({
		tokenService,
		passwordHasher,
		txManager,
		passwordResetRepoFactory: () => passwordResetRepo,
		recoveryAttemptPolicyService,
	});

	const result = await handler.execute({ token: "raw-token", password: "ValidPass123!" });
	assert.deepEqual(result, { status: "expired", tokenHash: "hash:raw-token" });
	assert.equal(receivedTokenHash, "hash:raw-token");
});

test("ResetPasswordHandler.execute returns RATE_LIMITED when token attempts exceed limit", async () => {
	const tokenService: TokenService = {
		generate: () => "unused",
		hash: token => `hash:${token}`,
	};
	const passwordHasher: PasswordHasher = {
		hash: async plain => createPasswordHash(`hash:${plain}`),
		verify: async () => false,
	};
	const passwordResetRepo: PasswordResetRepository = {
		create: async () => {},
		resetPasswordByTokenHash: async () => "invalid_token",
	};
	const txManager: TransactionManager = {
		runInTransaction: async <T>(callback: (tx: TransactionalContext) => Promise<T>) => {
			const tx = createTransactionalContext({
				query: async () => ({ rows: [], rowCount: 0 }),
			});
			return callback(tx);
		},
	};
	const recoveryAttemptPolicyService = new RecoveryAttemptPolicyService(tokenService, {
		forgotPasswordIdentifier: { max: 10, timeWindowMs: 60_000 },
		resetPasswordIdentifier: { max: 1, timeWindowMs: 60_000 },
	});
	const handler = new ResetPasswordHandler({
		tokenService,
		passwordHasher,
		txManager,
		passwordResetRepoFactory: () => passwordResetRepo,
		recoveryAttemptPolicyService,
	});

	await handler.execute({ token: "raw-token", password: "ValidPass123!" });
	const second = await handler.execute({ token: "raw-token", password: "ValidPass123!" });

	assert.deepEqual(second, { status: "RATE_LIMITED", tokenHash: "hash:raw-token" });
});
