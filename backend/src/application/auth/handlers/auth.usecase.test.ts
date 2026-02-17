import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import type { AuthPolicy } from "@application/auth/ports/auth-policy.js";
import type { EmailOutbox } from "@application/auth/ports/email-outbox.js";
import type { EmailVerificationRepository } from "@application/auth/ports/email-verification-repository.js";
import type { PasswordHasher } from "@application/auth/ports/password-hasher.js";
import type { TokenService } from "@application/auth/ports/token-service.js";
import type { TransactionManager } from "@application/common/ports/transaction-manager.js";
import type { UserRepository } from "@application/auth/ports/user-repository.js";
import { User } from "@domain/auth/entities/user.js";
import { createEmail } from "@domain/auth/value-objects/email.js";
import {
	createPasswordHash,
	passwordHashToString,
} from "@domain/auth/value-objects/password-hash.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";
import { AuthUseCase } from "./auth.usecase.js";

function mockUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
	return {
		findByEmail: async () => null,
		findAuthData: async () => null,
		findById: async () => null,
		createUser: async () => {
			throw new Error("createUser not mocked");
		},
		updateCredentials: async () => {},
		confirmEmail: async () => false,
		...overrides,
	};
}

function mockEmailVerificationRepo(
	overrides: Partial<EmailVerificationRepository> = {}
): EmailVerificationRepository {
	return {
		create: async () => {},
		findByTokenHash: async () => null,
		confirmEmailByTokenHash: async () => false,
		consume: async () => {},
		...overrides,
	};
}

function mockEmailOutbox(
	overrides: Partial<EmailOutbox> = {}
): EmailOutbox {
	return {
		enqueue: async () => {},
		...overrides,
	};
}

function mockTransactionManager(): TransactionManager {
	return {
		runInTransaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
			// Execute callback directly without actual transaction
			const mockTx = {
				query: async () => ({ rows: [], rowCount: 0 }),
			};
			return callback(mockTx);
		},
	};
}

function buildPasswordHasher(): PasswordHasher {
	return {
		hash: async (plain) => createPasswordHash(`hash:${plain}`),
		verify: async (hash, plain) => passwordHashToString(hash) === `hash:${plain}`,
	};
}

function buildTokenService(): TokenService {
	return {
		generate: () => "token-123",
		hash: (token) => createHash("sha256").update(token).digest("hex"),
	};
}

function buildAuthPolicy(overrides: Partial<AuthPolicy> = {}): AuthPolicy {
	return {
		isAllowedEmail: (email) => {
			const domain = email.split("@")[1]?.toLowerCase();
			return domain === "camerfirma.com";
		},
		getEmailVerificationTtlMs: () => 60_000,
		...overrides,
	};
}

function buildAuthUseCase(
	userRepo: UserRepository,
	emailVerificationRepo: EmailVerificationRepository,
	emailOutbox: EmailOutbox,
	overrides?: {
		passwordHasher?: PasswordHasher;
		tokenService?: TokenService;
		authPolicy?: AuthPolicy;
		confirmationBaseUrl?: string;
		txManager?: TransactionManager;
	}
) {
	const passwordHasher = overrides?.passwordHasher ?? buildPasswordHasher();
	const tokenService = overrides?.tokenService ?? buildTokenService();
	const authPolicy = overrides?.authPolicy ?? buildAuthPolicy();
	const confirmationBaseUrl = overrides?.confirmationBaseUrl ?? "http://localhost:3001";
	
	// Custom txManager that uses the mocked repos
	const txManager: TransactionManager = {
		runInTransaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
			// Pass an object that will make factories return the mocked repos
			const mockTx = { userRepo, emailVerificationRepo };
			return callback(mockTx);
		},
	};

	// Factories that extract repos from the transaction context
	const userRepoFactory = (tx: any) => tx.userRepo ?? userRepo;
	const emailVerificationRepoFactory = (tx: any) => tx.emailVerificationRepo ?? emailVerificationRepo;

	return new AuthUseCase({
		authPolicy,
		passwordHasher,
		tokenService,
		txManager: overrides?.txManager ?? txManager,
		userRepoFactory,
		emailVerificationRepoFactory,
		emailOutbox,
		confirmationBaseUrl,
	});
}

test("AuthUseCase.login rejects non-allowed domain", async () => {
	let called = false;
	const userRepo = mockUserRepo({
		findByEmail: async () => {
			called = true;
			return null;
		},
	});
	const auth = buildAuthUseCase(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await auth.login("user@other.com", "1234");
	assert.deepEqual(result, { status: "INVALID_CREDENTIALS" });
	assert.equal(called, false);
});

test("AuthUseCase.login returns null when user not found", async () => {
	const userRepo = mockUserRepo({
		findAuthData: async () => null,
	});
	const auth = buildAuthUseCase(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await auth.login("admin@camerfirma.com", "1234");
	assert.deepEqual(result, { status: "INVALID_CREDENTIALS" });
});

test("AuthUseCase.login returns NOT_CONFIRMED when user not confirmed", async () => {
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
	const auth = buildAuthUseCase(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox(),
		{ passwordHasher }
	);

	const result = await auth.login("admin@camerfirma.com", "1234");
	assert.deepEqual(result, { status: "NOT_CONFIRMED" });
});

test("AuthUseCase.login returns OK when credentials match", async () => {
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
	const auth = buildAuthUseCase(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox(),
		{ passwordHasher }
	);

	const result = await auth.login("admin@camerfirma.com", "1234");
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

test("AuthUseCase.register rejects non-allowed domain", async () => {
	const auth = buildAuthUseCase(
		mockUserRepo(),
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await auth.register("user@other.com", "123456", "User", "Other");
	assert.deepEqual(result, { status: "DOMAIN_NOT_ALLOWED" });
});

test("AuthUseCase.register returns ALREADY_CONFIRMED when user exists", async () => {
	const hash = createPasswordHash("hash:pass");
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
		findByEmail: async () => confirmedUser,
	});
	const auth = buildAuthUseCase(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await auth.register("admin@camerfirma.com", "123456", "Admin", "User");
	assert.deepEqual(result, { status: "ALREADY_CONFIRMED" });
});

test("AuthUseCase.register updates unconfirmed user and sends email", async () => {
	let updateCalled = false;
	let verificationCalled = false;
	let emailEnqueued = false;
	const hash = createPasswordHash("hash:old");
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
		findByEmail: async () => unconfirmedUser,
		updateCredentials: async () => {
			updateCalled = true;
		},
	});
	const emailVerificationRepo = mockEmailVerificationRepo({
		create: async () => {
			verificationCalled = true;
		},
	});
	const emailOutbox = mockEmailOutbox({
		enqueue: async () => {
			emailEnqueued = true;
		},
	});
	const auth = buildAuthUseCase(
		userRepo,
		emailVerificationRepo,
		emailOutbox
	);

	const result = await auth.register("admin@camerfirma.com", "123456", "Admin", "User");
	assert.deepEqual(result, { status: "OK" });
	assert.equal(updateCalled, true);
	assert.equal(verificationCalled, true);
	assert.equal(emailEnqueued, true);
});

test("AuthUseCase.register inserts new user and sends email", async () => {
	let createCalled = false;
	let verificationCalled = false;
	let emailEnqueued = false;
	const userRepo = mockUserRepo({
		findByEmail: async () => null,
		createUser: async (input) => {
			createCalled = true;
			const hash = await buildPasswordHasher().hash("pass");
			return new User(
				createUserId("user-2"),
				input.email,
				input.firstName,
				input.lastName,
				input.secondLastName,
				hash,
				null
			);
		},
	});
	const emailVerificationRepo = mockEmailVerificationRepo({
		create: async () => {
			verificationCalled = true;
		},
	});
	const emailOutbox = mockEmailOutbox({
		enqueue: async () => {
			emailEnqueued = true;
		},
	});
	const auth = buildAuthUseCase(
		userRepo,
		emailVerificationRepo,
		emailOutbox
	);

	const result = await auth.register("admin@camerfirma.com", "123456", "Admin", "User");
	assert.deepEqual(result, { status: "OK" });
	assert.equal(createCalled, true);
	assert.equal(verificationCalled, true);
	assert.equal(emailEnqueued, true);
});

test("AuthUseCase.confirmEmail returns false for invalid token", async () => {
	const auth = buildAuthUseCase(
		mockUserRepo(),
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const ok = await auth.confirmEmail("bad-token");
	assert.equal(ok, false);
});

test("AuthUseCase.confirmEmail marks user and verification", async () => {
	const token = "token-123";
	const tokenService = buildTokenService();
	const tokenHash = tokenService.hash(token);
	const emailVerificationRepo = mockEmailVerificationRepo({
		confirmEmailByTokenHash: async (hash) => {
			assert.equal(hash, tokenHash);
			return true;
		},
	});
	const auth = buildAuthUseCase(
		mockUserRepo(),
		emailVerificationRepo,
		mockEmailOutbox(),
		{ tokenService }
	);

	const ok = await auth.confirmEmail(token);
	assert.equal(ok, true);
});



