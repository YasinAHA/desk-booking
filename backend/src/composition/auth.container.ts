import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";

import type { TransactionalContext } from "@application/ports/transaction-manager.js";
import { AuthUseCase } from "@application/auth/handlers/auth.usecase.js";
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
		query: (text: string, params?: unknown[]) => Promise<any>;
		pool: Pool;
	};
};

export function buildAuthUseCase(app: FastifyInstance): AuthUseCase {
	const dbApp = app as AppWithDb;
	const passwordHasher = new Argon2PasswordHasher();
	const tokenService = new Sha256TokenService();
	const authPolicy = new DomainAuthPolicy(
		env.ALLOWED_EMAIL_DOMAINS,
		AUTH_EMAIL_VERIFICATION_TTL_MS,
	);
	const txManager = new PgTransactionManager(dbApp.db.pool);
	const emailOutbox = new PgEmailOutbox(dbApp.db);

	// Factories for creating transactional repository instances
	const userRepoFactory = (tx: TransactionalContext) => new PgUserRepository(tx);
	const emailVerificationRepoFactory = (tx: TransactionalContext) =>
		new PgEmailVerificationRepository(tx);

	return new AuthUseCase({
		authPolicy,
		passwordHasher,
		tokenService,
		txManager,
		userRepoFactory,
		emailVerificationRepoFactory,
		emailOutbox,
		confirmationBaseUrl: env.APP_BASE_URL,
	});
}

export function buildJwtTokenService(app: FastifyInstance): JwtTokenService {
	const dbApp = app as AppWithDb;
	const jwtProvider = new FastifyJwtProvider(app);
	const tokenRevocationRepository = new PgTokenRevocationRepository(dbApp.db.pool);
	return new JwtTokenService(jwtProvider, tokenRevocationRepository);
}
