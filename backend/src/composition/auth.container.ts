import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";

import { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import { RegisterHandler } from "@application/auth/commands/register.handler.js";
import {
	getTransactionalDbClient,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import { LoginHandler } from "@application/auth/queries/login.handler.js";
import { AUTH_EMAIL_VERIFICATION_TTL_MS } from "@config/constants.js";
import { env } from "@config/env.js";
import { PgTransactionManager } from "@infrastructure/db/pg-transaction-manager.js";
import { DomainAuthPolicy } from "@infrastructure/auth/policies/domain-auth-policy.js";
import { PgEmailOutbox } from "@infrastructure/auth/repositories/pg-email-outbox.js";
import { PgEmailVerificationRepository } from "@infrastructure/auth/repositories/pg-email-verification-repository.js";
import { PgTokenRevocationRepository } from "@infrastructure/auth/repositories/pg-token-revocation-repository.js";
import { PgUserRepository } from "@infrastructure/auth/repositories/pg-user-repository.js";
import { Argon2PasswordHasher } from "@infrastructure/auth/security/argon2-password-hasher.js";
import { Sha256TokenService } from "@infrastructure/auth/security/sha256-token-service.js";
import { FastifyJwtProvider } from "@interfaces/http/auth/adapters/fastify-jwt-provider.js";
import { JwtTokenService } from "@interfaces/http/auth/jwt-token.service.js";

type AppWithDb = FastifyInstance & {
	db: {
		query: (
			text: string,
			params?: unknown[]
		) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
		pool: Pool;
	};
};

export function buildAuthHandlers(app: FastifyInstance): {
	loginHandler: LoginHandler;
	registerHandler: RegisterHandler;
	confirmEmailHandler: ConfirmEmailHandler;
} {
	const dbApp = app as AppWithDb;
	const passwordHasher = new Argon2PasswordHasher();
	const tokenService = new Sha256TokenService();
	const authPolicy = new DomainAuthPolicy(
		env.ALLOWED_EMAIL_DOMAINS,
		AUTH_EMAIL_VERIFICATION_TTL_MS,
	);
	const txManager = new PgTransactionManager(dbApp.db.pool);
	const emailOutbox = new PgEmailOutbox(dbApp.db);
	const userRepo = new PgUserRepository(dbApp.db);

	const userRepoFactory = (tx: TransactionalContext) =>
		new PgUserRepository(getTransactionalDbClient(tx));
	const emailVerificationRepoFactory = (tx: TransactionalContext) =>
		new PgEmailVerificationRepository(getTransactionalDbClient(tx));

	const deps = {
		authPolicy,
		passwordHasher,
		tokenService,
		txManager,
		userRepo,
		userRepoFactory,
		emailVerificationRepoFactory,
		emailOutbox,
		confirmationBaseUrl: env.APP_BASE_URL,
	};

	return {
		loginHandler: new LoginHandler(deps),
		registerHandler: new RegisterHandler(deps),
		confirmEmailHandler: new ConfirmEmailHandler(deps),
	};
}

export function buildJwtTokenService(app: FastifyInstance): JwtTokenService {
	const dbApp = app as AppWithDb;
	const jwtProvider = new FastifyJwtProvider(app);
	const tokenRevocationRepository = new PgTokenRevocationRepository(dbApp.db.pool);
	return new JwtTokenService(jwtProvider, tokenRevocationRepository, {
		accessTokenTtl: env.JWT_EXPIRATION,
		refreshTokenTtl: env.JWT_REFRESH_EXPIRATION,
	});
}
