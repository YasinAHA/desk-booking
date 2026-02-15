import { createEmail, emailToString } from "../../domain/valueObjects/email.js";
import type { UserId } from "../../domain/valueObjects/user-id.js";
import { userIdToString } from "../../domain/valueObjects/user-id.js";
import type { AuthPolicy } from "../ports/auth-policy.js";
import type { EmailOutbox } from "../ports/email-outbox.js";
import type { EmailVerificationRepository } from "../ports/email-verification-repository.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { TokenService } from "../ports/token-service.js";
import type {
	TransactionManager,
	TransactionalContext,
} from "../ports/transaction-manager.js";
import type { UserRepository } from "../ports/user-repository.js";
import { EmailVerificationService } from "../services/email-verification.service.js";

type AuthUser = {
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

type UserRepoFactory = (tx: TransactionalContext) => UserRepository;
type EmailVerificationRepoFactory = (tx: TransactionalContext) => EmailVerificationRepository;

export class AuthUseCase {
	constructor(
		private readonly authPolicy: AuthPolicy,
		private readonly passwordHasher: PasswordHasher,
		private readonly tokenService: TokenService,
		private readonly txManager: TransactionManager,
		private readonly userRepoFactory: UserRepoFactory,
		private readonly emailVerificationRepoFactory: EmailVerificationRepoFactory,
		private readonly emailOutbox: EmailOutbox,
		private readonly confirmationBaseUrl: string,
	) {}

	async login(email: string, password: string): Promise<LoginResult> {
		if (!this.authPolicy.isAllowedEmail(email)) {
			return { status: "INVALID_CREDENTIALS" };
		}

		// Convert to value object
		let emailVO;
		try {
			emailVO = createEmail(email);
		} catch {
			return { status: "INVALID_CREDENTIALS" };
		}

		// Use transaction for read (simple pattern, no harm)
		const authData = await this.txManager.runInTransaction(async (tx: TransactionalContext) => {
			const userRepo = this.userRepoFactory(tx);
			return userRepo.findAuthData(emailVO);
		});

		if (!authData) {
			return { status: "INVALID_CREDENTIALS" };
		}

		// Use domain entity method
		if (!authData.user.isConfirmed()) {
			return { status: "NOT_CONFIRMED" };
		}

		const ok = await this.passwordHasher.verify(
			authData.passwordHash,
			password,
		);
		if (!ok) {
			return { status: "INVALID_CREDENTIALS" };
		}

		return {
			status: "OK",
			user: {
				id: userIdToString(authData.user.id),
				email: emailToString(authData.user.email),
				firstName: authData.user.firstName,
				lastName: authData.user.lastName,
				secondLastName: authData.user.secondLastName,
			},
		};
	}

	async register(
		email: string,
		password: string,
		firstName: string,
		lastName: string,
		secondLastName?: string,
	): Promise<RegisterResult> {
		if (!this.authPolicy.isAllowedEmail(email)) {
			return { status: "DOMAIN_NOT_ALLOWED" };
		}

		// Convert to value object
		let emailVO;
		try {
			emailVO = createEmail(email);
		} catch {
			return { status: "DOMAIN_NOT_ALLOWED" };
		}

		// Hash password outside transaction (expensive operation)
		const passwordHash = await this.passwordHasher.hash(password);

		// Wrap multi-step DB operations in transaction for atomicity
		return this.txManager.runInTransaction<RegisterResult>(async (tx: TransactionalContext) => {
			const userRepo = this.userRepoFactory(tx);
			const emailVerificationRepo = this.emailVerificationRepoFactory(tx);

			const existing = await userRepo.findByEmail(emailVO);

			if (existing) {
				// Use domain entity method
				if (existing.isConfirmed()) {
					return { status: "ALREADY_CONFIRMED" };
				}

				await userRepo.updateCredentials(
					existing.id,
					passwordHash,
					firstName,
					lastName,
					secondLastName ?? null,
				);
				await this.sendVerificationEmail(
					existing.id,
					email,
					emailVerificationRepo,
				);
				return { status: "OK" };
			}

			const created = await userRepo.createUser({
				email: emailVO,
				passwordHash,
				firstName,
				lastName,
				secondLastName: secondLastName ?? null,
			});

			await this.sendVerificationEmail(
				created.id,
				email,
				emailVerificationRepo,
			);

			return { status: "OK" };
		});
	}

	async confirmEmail(token: string): Promise<boolean> {
		const tokenHash = this.tokenService.hash(token);
		return this.txManager.runInTransaction(async (tx: TransactionalContext) => {
			const emailVerificationRepo = this.emailVerificationRepoFactory(tx);
			return emailVerificationRepo.confirmEmailByTokenHash(tokenHash);
		});
	}

	private async sendVerificationEmail(
		userId: UserId,
		email: string,
		emailVerificationRepo: EmailVerificationRepository,
	): Promise<void> {
		const service = new EmailVerificationService(
			emailVerificationRepo,
			this.emailOutbox,
			this.authPolicy,
			this.tokenService,
			this.confirmationBaseUrl,
		);
		await service.sendVerificationEmail(userId, email);
	}
}
