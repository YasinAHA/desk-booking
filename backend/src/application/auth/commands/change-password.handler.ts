import type { ChangePasswordCommand } from "@application/auth/commands/change-password.command.js";
import type { AuthDependencies, ChangePasswordResult } from "@application/auth/types.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

type ChangePasswordDependencies = Pick<
	AuthDependencies,
	"passwordHasher" | "txManager" | "userRepo" | "userRepoFactory"
>;

export class ChangePasswordHandler {
	constructor(private readonly deps: ChangePasswordDependencies) {}

	async execute(command: ChangePasswordCommand): Promise<ChangePasswordResult> {
		const userId = createUserId(command.userId);
		const user = await this.deps.userRepo.findById(userId);
		if (!user) {
			return { status: "INVALID_CREDENTIALS" };
		}

		const isCurrentPasswordValid = await this.deps.passwordHasher.verify(
			user.passwordHash,
			command.currentPassword
		);
		if (!isCurrentPasswordValid) {
			return { status: "INVALID_CREDENTIALS" };
		}

		const newPasswordHash = await this.deps.passwordHasher.hash(command.newPassword);
		const updatedUser = user.changePassword(newPasswordHash);
		await this.deps.txManager.runInTransaction(async tx => {
			const userRepo = this.deps.userRepoFactory(tx);
			await userRepo.updatePassword(updatedUser.id, updatedUser.passwordHash);
		});

		return { status: "OK" };
	}
}

