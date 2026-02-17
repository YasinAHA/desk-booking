import type { LoginQuery } from "@application/auth/queries/login.query.js";
import type { AuthDependencies, LoginResult } from "@application/auth/handlers/auth.types.js";
import { createEmail, emailToString } from "@domain/auth/value-objects/email.js";
import { userIdToString } from "@domain/auth/value-objects/user-id.js";

type LoginDependencies = Pick<
	AuthDependencies,
	"authPolicy" | "passwordHasher" | "txManager" | "userRepoFactory"
>;

export class LoginHandler {
	constructor(private readonly deps: LoginDependencies) {}

	async execute(query: LoginQuery): Promise<LoginResult> {
		if (!this.deps.authPolicy.isAllowedEmail(query.email)) {
			return { status: "INVALID_CREDENTIALS" };
		}

		let emailVO;
		try {
			emailVO = createEmail(query.email);
		} catch {
			return { status: "INVALID_CREDENTIALS" };
		}

		const authData = await this.deps.txManager.runInTransaction(async tx => {
			const userRepo = this.deps.userRepoFactory(tx);
			return userRepo.findAuthData(emailVO);
		});

		if (!authData) {
			return { status: "INVALID_CREDENTIALS" };
		}

		if (!authData.user.isConfirmed()) {
			return { status: "NOT_CONFIRMED" };
		}

		const ok = await this.deps.passwordHasher.verify(authData.passwordHash, query.password);
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
}

