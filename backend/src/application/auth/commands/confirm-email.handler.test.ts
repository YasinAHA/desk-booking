import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import type { EmailVerificationRepository } from "@application/auth/ports/email-verification-repository.js";
import type { TokenService } from "@application/auth/ports/token-service.js";
import {
	createTransactionalContext,
	type TransactionManager,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";

function mockEmailVerificationRepo(
	overrides: Partial<EmailVerificationRepository> = {}
): EmailVerificationRepository {
	return {
		create: async () => {},
		findByTokenHash: async () => null,
		confirmEmailByTokenHash: async () => "invalid_token",
		consume: async () => {},
		...overrides,
	};
}

function buildTokenService(): TokenService {
	return {
		generate: () => "token-123",
		hash: token => createHash("sha256").update(token).digest("hex"),
	};
}

function buildConfirmEmailHandler(
	emailVerificationRepo: EmailVerificationRepository,
	overrides?: {
		tokenService?: TokenService;
		txManager?: TransactionManager;
	}
): ConfirmEmailHandler {
	const tokenService = overrides?.tokenService ?? buildTokenService();

	const txManager: TransactionManager = {
		runInTransaction: async <T>(callback: (tx: TransactionalContext) => Promise<T>): Promise<T> => {
			const tx = createTransactionalContext({
				query: async () => ({ rows: [], rowCount: 0 }),
			});
			return callback(tx);
		},
	};

	return new ConfirmEmailHandler({
		tokenService,
		txManager: overrides?.txManager ?? txManager,
		emailVerificationRepoFactory: () => emailVerificationRepo,
	});
}

test("ConfirmEmailHandler.execute returns invalid_token for invalid token", async () => {
	const handler = buildConfirmEmailHandler(mockEmailVerificationRepo());

	const result = await handler.execute({ token: "bad-token" });
	assert.equal(result, "invalid_token");
});

test("ConfirmEmailHandler.execute returns confirmed when user and verification are updated", async () => {
	const token = "token-123";
	const tokenService = buildTokenService();
	const tokenHash = tokenService.hash(token);
	const emailVerificationRepo = mockEmailVerificationRepo({
		confirmEmailByTokenHash: async hash => {
			assert.equal(hash, tokenHash);
			return "confirmed";
		},
	});
	const handler = buildConfirmEmailHandler(emailVerificationRepo, { tokenService });

	const result = await handler.execute({ token });
	assert.equal(result, "confirmed");
});
