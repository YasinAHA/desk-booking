import type { ResetPasswordCommand } from "@application/auth/commands/reset-password.command.js";
import type { AuthDependencies, ResetPasswordHandlerResult } from "@application/auth/types.js";

type ResetPasswordDependencies = Pick<
	AuthDependencies,
	"tokenService" | "passwordHasher" | "txManager" | "passwordResetRepoFactory"
>;

export class ResetPasswordHandler {
	constructor(private readonly deps: ResetPasswordDependencies) {}

	async execute(command: ResetPasswordCommand): Promise<ResetPasswordHandlerResult> {
		const tokenHash = this.deps.tokenService.hash(command.token);
		const passwordHash = await this.deps.passwordHasher.hash(command.password);

		return this.deps.txManager.runInTransaction(async tx => {
			const passwordResetRepo = this.deps.passwordResetRepoFactory(tx);
			return passwordResetRepo.resetPasswordByTokenHash(tokenHash, passwordHash);
		});
	}
}
