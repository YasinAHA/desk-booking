import type { AuthPolicy } from "@application/ports/auth-policy.js";
import type { EmailOutbox } from "@application/ports/email-outbox.js";
import type { EmailVerificationRepository } from "@application/ports/email-verification-repository.js";
import type { PasswordHasher } from "@application/ports/password-hasher.js";
import type { TokenService } from "@application/ports/token-service.js";
import type {
	TransactionManager,
	TransactionalContext,
} from "@application/ports/transaction-manager.js";
import type { UserRepository } from "@application/ports/user-repository.js";

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
	| { status: "DOMAIN_NOT_ALLOWED" };

export type UserRepoFactory = (tx: TransactionalContext) => UserRepository;
export type EmailVerificationRepoFactory = (
	tx: TransactionalContext
) => EmailVerificationRepository;

export type AuthDependencies = {
	authPolicy: AuthPolicy;
	passwordHasher: PasswordHasher;
	tokenService: TokenService;
	txManager: TransactionManager;
	userRepoFactory: UserRepoFactory;
	emailVerificationRepoFactory: EmailVerificationRepoFactory;
	emailOutbox: EmailOutbox;
	confirmationBaseUrl: string;
};
