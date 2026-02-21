import type { AuthPolicy } from "@application/auth/ports/auth-policy.js";
import type { EmailOutbox } from "@application/auth/ports/email-outbox.js";
import type { EmailVerificationRepository } from "@application/auth/ports/email-verification-repository.js";
import type { PasswordHasher } from "@application/auth/ports/password-hasher.js";
import type { PasswordResetRepository, ResetPasswordResult } from "@application/auth/ports/password-reset-repository.js";
import type { TokenService } from "@application/auth/ports/token-service.js";
import type { RecoveryAttemptPolicyService } from "@application/auth/services/recovery-attempt-policy.service.js";
import type {
	TransactionManager,
	TransactionalContext,
} from "@application/common/ports/transaction-manager.js";
import type { UserRepository } from "@application/auth/ports/user-repository.js";

export type AuthUser = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	secondLastName: string | null;
};

export type LoginResult =
	| { status: "OK"; user: AuthUser }
	| { status: "NOT_CONFIRMED" }
	| { status: "INVALID_CREDENTIALS" };

export type RegisterResult =
	| { status: "OK" }
	| { status: "ALREADY_CONFIRMED" }
	| { status: "DOMAIN_NOT_ALLOWED" }
	| { status: "INVALID_PROFILE" };

export type ForgotPasswordResult =
	| { status: "OK"; emailHash?: string }
	| { status: "RATE_LIMITED"; emailHash: string };

export type ChangePasswordResult =
	| { status: "OK" }
	| { status: "INVALID_CREDENTIALS" };

export type ResetPasswordHandlerResult =
	| { status: "RATE_LIMITED"; tokenHash: string }
	| { status: ResetPasswordResult; tokenHash: string };

export type UserRepoFactory = (tx: TransactionalContext) => UserRepository;
export type EmailVerificationRepoFactory = (
	tx: TransactionalContext
) => EmailVerificationRepository;
export type PasswordResetRepoFactory = (
	tx: TransactionalContext
) => PasswordResetRepository;

export type AuthDependencies = {
	authPolicy: AuthPolicy;
	passwordHasher: PasswordHasher;
	tokenService: TokenService;
	txManager: TransactionManager;
	userRepo: UserRepository;
	userRepoFactory: UserRepoFactory;
	emailVerificationRepoFactory: EmailVerificationRepoFactory;
	passwordResetRepoFactory: PasswordResetRepoFactory;
	recoveryAttemptPolicyService: RecoveryAttemptPolicyService;
	emailOutbox: EmailOutbox;
	confirmationBaseUrl: string;
	passwordResetBaseUrl: string;
};
