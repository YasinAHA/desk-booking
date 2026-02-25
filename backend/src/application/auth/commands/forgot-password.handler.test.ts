import assert from "node:assert/strict";
import test from "node:test";

import { ForgotPasswordHandler } from "@application/auth/commands/forgot-password.handler.js";
import type { AuthPolicy } from "@application/auth/ports/auth-policy.js";
import type { EmailOutbox } from "@application/auth/ports/email-outbox.js";
import type { PasswordResetRepository } from "@application/auth/ports/password-reset-repository.js";
import type { TokenService } from "@application/auth/ports/token-service.js";
import { RecoveryAttemptPolicyService } from "@application/auth/services/recovery-attempt-policy.service.js";
import type { UserRepository } from "@application/auth/ports/user-repository.js";
import {
	createTransactionalContext,
	type TransactionManager,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import { User } from "@domain/auth/entities/user.js";
import { createEmail } from "@domain/auth/value-objects/email.js";
import { createPasswordHash } from "@domain/auth/value-objects/password-hash.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

function buildUserRepo(findByEmail: UserRepository["findByEmail"]): UserRepository {
	return {
		findByEmail,
		findAuthData: async () => null,
		findById: async () => null,
		createUser: async () => {
			throw new Error("not used");
		},
		updateCredentials: async () => {},
		updatePassword: async () => {},
		confirmEmail: async () => false,
	};
}

function buildDeps(overrides?: {
	userRepo?: UserRepository;
	passwordResetRepo?: PasswordResetRepository;
	emailOutbox?: EmailOutbox;
}) {
	const authPolicy: AuthPolicy = {
		isAllowedEmail: email => email.endsWith("@camerfirma.com"),
		getEmailVerificationTtlMs: () => 60_000,
		getPasswordResetTtlMs: () => 60_000,
	};
	const tokenService: TokenService = {
		generate: () => "raw-token",
		hash: token => `hash:${token}`,
	};
	const recoveryAttemptPolicyService = new RecoveryAttemptPolicyService(tokenService, {
		forgotPasswordIdentifier: { max: 10, timeWindowMs: 60_000 },
		resetPasswordIdentifier: { max: 10, timeWindowMs: 60_000 },
	});
	const txManager: TransactionManager = {
		runInTransaction: async <T>(callback: (tx: TransactionalContext) => Promise<T>) => {
			const tx = createTransactionalContext({
				query: async () => ({ rows: [], rowCount: 0 }),
			});
			return callback(tx);
		},
	};
	const passwordResetRepo: PasswordResetRepository =
		overrides?.passwordResetRepo ??
		({
			create: async () => {},
			resetPasswordByTokenHash: async () => "invalid_token",
		} satisfies PasswordResetRepository);
	const emailOutbox: EmailOutbox =
		overrides?.emailOutbox ??
		({
			enqueue: async () => {},
		} satisfies EmailOutbox);

	const userRepo =
		overrides?.userRepo ??
		buildUserRepo(async () => null);

	return {
		authPolicy,
		tokenService,
		txManager,
		userRepo,
		passwordResetRepoFactory: () => passwordResetRepo,
		recoveryAttemptPolicyService,
		emailOutbox,
		passwordResetBaseUrl: "http://localhost:3001",
	};
}

test("ForgotPasswordHandler.execute returns OK for unknown user (anti-enumeration)", async () => {
	const handler = new ForgotPasswordHandler(buildDeps());
	const result = await handler.execute({ email: "unknown@camerfirma.com" });
	assert.deepEqual(result, { status: "OK", emailHash: "hash:unknown@camerfirma.com" });
});

test("ForgotPasswordHandler.execute creates reset and enqueues email for existing user", async () => {
	let created = false;
	let enqueued = false;
	let emailBody = "";
	const user = new User(
		createUserId("user-1"),
		createEmail("user@camerfirma.com"),
		"User",
		"Test",
		null,
		createPasswordHash("hash:old"),
		"2026-01-01T00:00:00.000Z"
	);
	const userRepo = buildUserRepo(async () => user);
	const passwordResetRepo: PasswordResetRepository = {
		create: async () => {
			created = true;
		},
		resetPasswordByTokenHash: async () => "invalid_token",
	};
	const emailOutbox: EmailOutbox = {
		enqueue: async message => {
			enqueued = true;
			emailBody = message.body;
			assert.equal(message.type, "password_reset");
			assert.equal(message.to, "user@camerfirma.com");
		},
	};

	const handler = new ForgotPasswordHandler(
		buildDeps({ userRepo, passwordResetRepo, emailOutbox })
	);
	const result = await handler.execute({ email: "user@camerfirma.com" });

	assert.deepEqual(result, { status: "OK", emailHash: "hash:user@camerfirma.com" });
	assert.equal(created, true);
	assert.equal(enqueued, true);
	assert.match(emailBody, /#token=raw-token/);
	assert.doesNotMatch(emailBody, /\?token=/);
});

test("ForgotPasswordHandler.execute returns RATE_LIMITED when identifier limit is reached", async () => {
	const tokenService: TokenService = {
		generate: () => "raw-token",
		hash: token => `hash:${token}`,
	};
	const recoveryAttemptPolicyService = new RecoveryAttemptPolicyService(tokenService, {
		forgotPasswordIdentifier: { max: 1, timeWindowMs: 60_000 },
		resetPasswordIdentifier: { max: 10, timeWindowMs: 60_000 },
	});
	const handler = new ForgotPasswordHandler({
		...buildDeps(),
		recoveryAttemptPolicyService,
	});

	await handler.execute({ email: "user@camerfirma.com" });
	const second = await handler.execute({ email: "user@camerfirma.com" });

	assert.deepEqual(second, {
		status: "RATE_LIMITED",
		emailHash: "hash:user@camerfirma.com",
	});
});
