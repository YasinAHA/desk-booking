import type { RegisterCommand } from "@application/auth/commands/register.command.js";
import type { AuthDependencies, RegisterResult } from "@application/auth/types.js";
import type { EmailVerificationRepository } from "@application/auth/ports/email-verification-repository.js";
import { EmailVerificationService } from "@application/auth/services/email-verification.service.js";
import { InvalidUserProfileError, User } from "@domain/auth/entities/user.js";
import { InvalidEmailError } from "@domain/auth/errors/auth-domain-errors.js";
import { createEmail } from "@domain/auth/value-objects/email.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";

type RegisterDependencies = Pick<
	AuthDependencies,
	| "authPolicy"
	| "passwordHasher"
	| "tokenService"
	| "txManager"
	| "userRepoFactory"
	| "emailVerificationRepoFactory"
	| "emailOutbox"
	| "confirmationBaseUrl"
>;

export class RegisterHandler {
	constructor(private readonly deps: RegisterDependencies) {}

	async execute(command: RegisterCommand): Promise<RegisterResult> {
		if (!this.deps.authPolicy.isAllowedEmail(command.email)) {
			return { status: "DOMAIN_NOT_ALLOWED" };
		}

		let emailVO;
		try {
			emailVO = createEmail(command.email);
		} catch (error) {
			if (!(error instanceof InvalidEmailError)) {
				throw error;
			}
			return { status: "DOMAIN_NOT_ALLOWED" };
		}

		let profile;
		try {
			profile = User.normalizeProfile({
				firstName: command.firstName,
				lastName: command.lastName,
				secondLastName: command.secondLastName ?? null,
			});
		} catch (error) {
			if (error instanceof InvalidUserProfileError) {
				return { status: "INVALID_PROFILE" };
			}
			throw error;
		}

		const passwordHash = await this.deps.passwordHasher.hash(command.password);

		return this.deps.txManager.runInTransaction<RegisterResult>(async tx => {
			const userRepo = this.deps.userRepoFactory(tx);
			const emailVerificationRepo = this.deps.emailVerificationRepoFactory(tx);

			const existing = await userRepo.findByEmail(emailVO);

			if (existing) {
				if (existing.isConfirmed()) {
					return { status: "ALREADY_CONFIRMED" };
				}

				const updatedUser = existing.updateCredentials(
					passwordHash,
					profile.firstName,
					profile.lastName,
					profile.secondLastName
				);
				await userRepo.updateCredentials(
					updatedUser.id,
					updatedUser.passwordHash,
					updatedUser.firstName,
					updatedUser.lastName,
					updatedUser.secondLastName
				);
				await this.sendVerificationEmail(existing.id, command.email, emailVerificationRepo);
				return { status: "OK" };
			}

			const created = await userRepo.createUser({
				email: emailVO,
				passwordHash,
				firstName: profile.firstName,
				lastName: profile.lastName,
				secondLastName: profile.secondLastName,
			});

			await this.sendVerificationEmail(created.id, command.email, emailVerificationRepo);
			return { status: "OK" };
		});
	}

	private async sendVerificationEmail(
		userId: UserId,
		email: string,
		emailVerificationRepo: EmailVerificationRepository
	): Promise<void> {
		const service = new EmailVerificationService(
			emailVerificationRepo,
			this.deps.emailOutbox,
			this.deps.authPolicy,
			this.deps.tokenService,
			this.deps.confirmationBaseUrl
		);
		await service.sendVerificationEmail(userId, email);
	}
}
