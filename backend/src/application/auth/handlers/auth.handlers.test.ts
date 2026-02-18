import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import { RegisterHandler } from "@application/auth/commands/register.handler.js";
import type { AuthPolicy } from "@application/auth/ports/auth-policy.js";
import type { EmailOutbox } from "@application/auth/ports/email-outbox.js";
import type { EmailVerificationRepository } from "@application/auth/ports/email-verification-repository.js";
import type { PasswordHasher } from "@application/auth/ports/password-hasher.js";
import type { TokenService } from "@application/auth/ports/token-service.js";
import type { UserRepository } from "@application/auth/ports/user-repository.js";
import { LoginHandler } from "@application/auth/queries/login.handler.js";
import {
	createTransactionalContext,
	type TransactionManager,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import { User } from "@domain/auth/entities/user.js";
import { createEmail } from "@domain/auth/value-objects/email.js";
import {
	createPasswordHash,
	passwordHashToString,
} from "@domain/auth/value-objects/password-hash.js";
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
		confirmEmailByTokenHash: async () => "invalid_token",
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

function buildPasswordHasher(): PasswordHasher {
	return {
		hash: async plain => createPasswordHash(`hash:${plain}`),
		verify: async (hash, plain) => passwordHashToString(hash) === `hash:${plain}`,
	};
}

function buildTokenService(): TokenService {
	return {
		generate: () => "token-123",
		hash: token => createHash("sha256").update(token).digest("hex"),
	};
}

function buildAuthPolicy(overrides: Partial<AuthPolicy> = {}): AuthPolicy {
	return {
		isAllowedEmail: email => {
			const domain = email.split("@")[1]?.toLowerCase();
			return domain === "camerfirma.com";
		},
		getEmailVerificationTtlMs: () => 60_000,
		...overrides,
	};
}

function buildAuthHandlers(
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

	const txManager: TransactionManager = {
		runInTransaction: async <T>(callback: (tx: TransactionalContext) => Promise<T>): Promise<T> => {
			const tx = createTransactionalContext({
				query: async () => ({ rows: [], rowCount: 0 }),
			});
			return callback(tx);
		},
	};

	const userRepoFactory = () => userRepo;
	const emailVerificationRepoFactory = () => emailVerificationRepo;

	const deps = {
		authPolicy,
		passwordHasher,
		tokenService,
		txManager: overrides?.txManager ?? txManager,
		userRepoFactory,
		emailVerificationRepoFactory,
		emailOutbox,
		confirmationBaseUrl,
	};

	return {
		loginHandler: new LoginHandler(deps),
		registerHandler: new RegisterHandler(deps),
		confirmEmailHandler: new ConfirmEmailHandler(deps),
	};
}

test("LoginHandler.execute rejects non-allowed domain", async () => {
	let called = false;
	const userRepo = mockUserRepo({
		findByEmail: async () => {
			called = true;
			return null;
		},
	});
	const handlers = buildAuthHandlers(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await handlers.loginHandler.execute({ email: "user@other.com", password: "1234" });
	assert.deepEqual(result, { status: "INVALID_CREDENTIALS" });
	assert.equal(called, false);
});

test("LoginHandler.execute returns null when user not found", async () => {
	const userRepo = mockUserRepo({
		findAuthData: async () => null,
	});
	const handlers = buildAuthHandlers(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await handlers.loginHandler.execute({ email: "admin@camerfirma.com", password: "1234" });
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
	const handlers = buildAuthHandlers(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox(),
		{ passwordHasher }
	);

	const result = await handlers.loginHandler.execute({ email: "admin@camerfirma.com", password: "1234" });
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
	const handlers = buildAuthHandlers(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox(),
		{ passwordHasher }
	);

	const result = await handlers.loginHandler.execute({ email: "admin@camerfirma.com", password: "1234" });
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

test("RegisterHandler.execute rejects non-allowed domain", async () => {
	const handlers = buildAuthHandlers(
		mockUserRepo(),
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await handlers.registerHandler.execute({
		email: "user@other.com",
		password: "123456",
		firstName: "User",
		lastName: "Other",
	});
	assert.deepEqual(result, { status: "DOMAIN_NOT_ALLOWED" });
});

test("RegisterHandler.execute returns ALREADY_CONFIRMED when user exists", async () => {
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
	const handlers = buildAuthHandlers(
		userRepo,
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await handlers.registerHandler.execute({
		email: "admin@camerfirma.com",
		password: "123456",
		firstName: "Admin",
		lastName: "User",
	});
	assert.deepEqual(result, { status: "ALREADY_CONFIRMED" });
});

test("RegisterHandler.execute updates unconfirmed user and sends email", async () => {
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
	const handlers = buildAuthHandlers(userRepo, emailVerificationRepo, emailOutbox);

	const result = await handlers.registerHandler.execute({
		email: "admin@camerfirma.com",
		password: "123456",
		firstName: "Admin",
		lastName: "User",
	});
	assert.deepEqual(result, { status: "OK" });
	assert.equal(updateCalled, true);
	assert.equal(verificationCalled, true);
	assert.equal(emailEnqueued, true);
});

test("RegisterHandler.execute inserts new user and sends email", async () => {
	let createCalled = false;
	let verificationCalled = false;
	let emailEnqueued = false;
	const userRepo = mockUserRepo({
		findByEmail: async () => null,
		createUser: async input => {
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
	const handlers = buildAuthHandlers(userRepo, emailVerificationRepo, emailOutbox);

	const result = await handlers.registerHandler.execute({
		email: "admin@camerfirma.com",
		password: "123456",
		firstName: "Admin",
		lastName: "User",
	});
	assert.deepEqual(result, { status: "OK" });
	assert.equal(createCalled, true);
	assert.equal(verificationCalled, true);
	assert.equal(emailEnqueued, true);
});

test("ConfirmEmailHandler.execute returns invalid_token for invalid token", async () => {
	const handlers = buildAuthHandlers(
		mockUserRepo(),
		mockEmailVerificationRepo(),
		mockEmailOutbox()
	);

	const result = await handlers.confirmEmailHandler.execute({ token: "bad-token" });
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
	const handlers = buildAuthHandlers(
		mockUserRepo(),
		emailVerificationRepo,
		mockEmailOutbox(),
		{ tokenService }
	);

	const result = await handlers.confirmEmailHandler.execute({ token });
	assert.equal(result, "confirmed");
});





