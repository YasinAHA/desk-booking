import type { ConfirmEmailCommand } from "@application/auth/commands/confirm-email.command.js";
import type { AuthDependencies } from "@application/auth/handlers/auth.types.js";

type ConfirmEmailDependencies = Pick<
	AuthDependencies,
	"tokenService" | "txManager" | "emailVerificationRepoFactory"
>;

export class ConfirmEmailHandler {
	constructor(private readonly deps: ConfirmEmailDependencies) {}

	async execute(command: ConfirmEmailCommand): Promise<boolean> {
		const tokenHash = this.deps.tokenService.hash(command.token);
		return this.deps.txManager.runInTransaction(async tx => {
			const emailVerificationRepo = this.deps.emailVerificationRepoFactory(tx);
			return emailVerificationRepo.confirmEmailByTokenHash(tokenHash);
		});
	}
}
