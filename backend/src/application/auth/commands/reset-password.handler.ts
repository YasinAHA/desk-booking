import type { ResetPasswordCommand } from "@application/auth/commands/reset-password.command.js";
import type { AuthDependencies, ResetPasswordHandlerResult } from "@application/auth/types.js";

type ResetPasswordDependencies = Pick<
	AuthDependencies,
	| "tokenService"
	| "passwordHasher"
	| "txManager"
	| "passwordResetRepoFactory"
	| "recoveryAttemptPolicyService"
>;

export class ResetPasswordHandler {
	constructor(private readonly deps: ResetPasswordDependencies) {}

	async execute(command: ResetPasswordCommand): Promise<ResetPasswordHandlerResult> {
		const attempt = this.deps.recoveryAttemptPolicyService.consumeResetPasswordAttempt(
			command.token
		);
		if (!attempt.allowed) {
			return { status: "RATE_LIMITED", tokenHash: attempt.tokenHash };
		}

		const tokenHash = this.deps.tokenService.hash(command.token);
		const passwordHash = await this.deps.passwordHasher.hash(command.password);
		const status = await this.deps.txManager.runInTransaction(async tx => {
			const passwordResetRepo = this.deps.passwordResetRepoFactory(tx);
			return passwordResetRepo.resetPasswordByTokenHash(tokenHash, passwordHash);
		});

		return { status, tokenHash: attempt.tokenHash };
	}
}
