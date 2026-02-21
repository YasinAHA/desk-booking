import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";

import { ChangePasswordHandler } from "@application/auth/commands/change-password.handler.js";
import { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import { ForgotPasswordHandler } from "@application/auth/commands/forgot-password.handler.js";
import { RegisterHandler } from "@application/auth/commands/register.handler.js";
import { ResetPasswordHandler } from "@application/auth/commands/reset-password.handler.js";
import { LoginHandler } from "@application/auth/queries/login.handler.js";
import { RecoveryAttemptPolicyService } from "@application/auth/services/recovery-attempt-policy.service.js";
import {
	getTransactionalDbClient,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import {
	AUTH_EMAIL_VERIFICATION_TTL_MS,
	AUTH_FORGOT_PASSWORD_IDENTIFIER_RATE_LIMIT,
	AUTH_PASSWORD_RESET_TTL_MS,
	AUTH_RESET_PASSWORD_IDENTIFIER_RATE_LIMIT,
} from "@config/constants.js";
import { env } from "@config/env.js";
import { DomainAuthPolicy } from "@infrastructure/auth/policies/domain-auth-policy.js";
import { PgEmailOutbox } from "@infrastructure/auth/repositories/pg-email-outbox.js";
import { PgEmailVerificationRepository } from "@infrastructure/auth/repositories/pg-email-verification-repository.js";
import { PgPasswordResetRepository } from "@infrastructure/auth/repositories/pg-password-reset-repository.js";
import { PgTokenRevocationRepository } from "@infrastructure/auth/repositories/pg-token-revocation-repository.js";
import { PgUserRepository } from "@infrastructure/auth/repositories/pg-user-repository.js";
import { PgUserSessionRepository } from "@infrastructure/auth/repositories/pg-user-session-repository.js";
import { Argon2PasswordHasher } from "@infrastructure/auth/security/argon2-password-hasher.js";
import { JoseJwtProvider } from "@infrastructure/auth/security/jose-jwt-provider.js";
import { Sha256TokenService } from "@infrastructure/auth/security/sha256-token-service.js";
import { JwtTokenService } from "@infrastructure/auth/security/jwt-token.service.js";
import { PgTransactionManager } from "@infrastructure/db/pg-transaction-manager.js";

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
	forgotPasswordHandler: ForgotPasswordHandler;
	resetPasswordHandler: ResetPasswordHandler;
	changePasswordHandler: ChangePasswordHandler;
	recoveryAttemptPolicyService: RecoveryAttemptPolicyService;
} {
	const dbApp = app as AppWithDb;
	const passwordHasher = new Argon2PasswordHasher();
	const tokenService = new Sha256TokenService();
	const authPolicy = new DomainAuthPolicy(
		env.ALLOWED_EMAIL_DOMAINS,
		AUTH_EMAIL_VERIFICATION_TTL_MS,
		AUTH_PASSWORD_RESET_TTL_MS
	);
	const txManager = new PgTransactionManager(dbApp.db.pool);
	const emailOutbox = new PgEmailOutbox(dbApp.db);
	const userRepo = new PgUserRepository(dbApp.db);
	const recoveryAttemptPolicyService = new RecoveryAttemptPolicyService(tokenService, {
		forgotPasswordIdentifier: AUTH_FORGOT_PASSWORD_IDENTIFIER_RATE_LIMIT,
		resetPasswordIdentifier: AUTH_RESET_PASSWORD_IDENTIFIER_RATE_LIMIT,
	});

	const userRepoFactory = (tx: TransactionalContext) =>
		new PgUserRepository(getTransactionalDbClient(tx));
	const emailVerificationRepoFactory = (tx: TransactionalContext) =>
		new PgEmailVerificationRepository(getTransactionalDbClient(tx));
	const passwordResetRepoFactory = (tx: TransactionalContext) =>
		new PgPasswordResetRepository(getTransactionalDbClient(tx));

	const deps = {
		authPolicy,
		passwordHasher,
		tokenService,
		txManager,
		userRepo,
		userRepoFactory,
		emailVerificationRepoFactory,
		passwordResetRepoFactory,
		emailOutbox,
		confirmationBaseUrl: env.APP_BASE_URL,
		passwordResetBaseUrl: env.FRONTEND_BASE_URL,
	};

	return {
		loginHandler: new LoginHandler(deps),
		registerHandler: new RegisterHandler(deps),
		confirmEmailHandler: new ConfirmEmailHandler(deps),
		forgotPasswordHandler: new ForgotPasswordHandler(deps),
		resetPasswordHandler: new ResetPasswordHandler(deps),
		changePasswordHandler: new ChangePasswordHandler(deps),
		recoveryAttemptPolicyService,
	};
}

export function buildJwtTokenService(app: FastifyInstance): JwtTokenService {
	const dbApp = app as AppWithDb;
	const jwtProvider = new JoseJwtProvider(env.JWT_SECRET, env.JWT_REFRESH_SECRET);
	const tokenRevocationRepository = new PgTokenRevocationRepository(dbApp.db.pool);
	const userSessionRepository = new PgUserSessionRepository(dbApp.db.pool);
	return new JwtTokenService(jwtProvider, tokenRevocationRepository, userSessionRepository, {
		accessTokenTtl: env.JWT_EXPIRATION,
		refreshTokenTtl: env.JWT_REFRESH_EXPIRATION,
	});
}
