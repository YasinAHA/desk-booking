import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";

import { AuthUseCase } from "../../../application/usecases/auth.usecase.js";
import { AUTH_EMAIL_VERIFICATION_TTL_MS } from "../../../config/constants.js";
import { env } from "../../../config/env.js";
import { PgTransactionManager } from "../../../infrastructure/db/pgTransactionManager.js";
import { DomainAuthPolicy } from "../../../infrastructure/policies/domainAuthPolicy.js";
import { PgEmailOutbox } from "../../../infrastructure/repositories/pgEmailOutbox.js";
import { PgEmailVerificationRepository } from "../../../infrastructure/repositories/pgEmailVerificationRepository.js";
import { PgTokenRevocationRepository } from "../../../infrastructure/repositories/pgTokenRevocationRepository.js";
import { PgUserRepository } from "../../../infrastructure/repositories/pgUserRepository.js";
import { Argon2PasswordHasher } from "../../../infrastructure/security/argon2PasswordHasher.js";
import { Sha256TokenService } from "../../../infrastructure/security/sha256TokenService.js";
import { JwtTokenService } from "./jwt-token.service.js";
import { FastifyJwtProvider } from "./adapters/fastifyJwtProvider.js";

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
	const userRepoFactory = (tx: any) => new PgUserRepository(tx);
	const emailVerificationRepoFactory = (tx: any) => new PgEmailVerificationRepository(tx);

	return new AuthUseCase(
		authPolicy,
		passwordHasher,
		tokenService,
		txManager,
		userRepoFactory,
		emailVerificationRepoFactory,
		emailOutbox,
		env.APP_BASE_URL,
	);
}

export function buildJwtTokenService(app: FastifyInstance): JwtTokenService {
	const dbApp = app as AppWithDb;
	const jwtProvider = new FastifyJwtProvider(app);
	const tokenRevocationRepository = new PgTokenRevocationRepository(dbApp.db.pool);
	return new JwtTokenService(jwtProvider, tokenRevocationRepository);
}
