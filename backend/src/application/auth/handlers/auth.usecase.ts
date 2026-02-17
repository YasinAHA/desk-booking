import type { ConfirmEmailCommand } from "@application/auth/commands/confirm-email.command.js";
import { ConfirmEmailHandler } from "@application/auth/commands/confirm-email.handler.js";
import type { RegisterCommand } from "@application/auth/commands/register.command.js";
import { RegisterHandler } from "@application/auth/commands/register.handler.js";
import type {
	AuthDependencies,
	LoginResult,
	RegisterResult,
} from "@application/auth/handlers/auth.types.js";
import type { LoginQuery } from "@application/auth/queries/login.query.js";
import { LoginHandler } from "@application/auth/queries/login.handler.js";

export type { LoginResult, RegisterResult };

export class AuthUseCase {
	private readonly loginHandler: LoginHandler;
	private readonly registerHandler: RegisterHandler;
	private readonly confirmEmailHandler: ConfirmEmailHandler;

	constructor(
		authPolicy: AuthDependencies["authPolicy"],
		passwordHasher: AuthDependencies["passwordHasher"],
		tokenService: AuthDependencies["tokenService"],
		txManager: AuthDependencies["txManager"],
		userRepoFactory: AuthDependencies["userRepoFactory"],
		emailVerificationRepoFactory: AuthDependencies["emailVerificationRepoFactory"],
		emailOutbox: AuthDependencies["emailOutbox"],
		confirmationBaseUrl: AuthDependencies["confirmationBaseUrl"]
	) {
		const deps: AuthDependencies = {
			authPolicy,
			passwordHasher,
			tokenService,
			txManager,
			userRepoFactory,
			emailVerificationRepoFactory,
			emailOutbox,
			confirmationBaseUrl,
		};

		this.loginHandler = new LoginHandler(deps);
		this.registerHandler = new RegisterHandler(deps);
		this.confirmEmailHandler = new ConfirmEmailHandler(deps);
	}

	async login(email: string, password: string): Promise<LoginResult> {
		const query: LoginQuery = { email, password };
		return this.loginHandler.execute(query);
	}

	async register(
		email: string,
		password: string,
		firstName: string,
		lastName: string,
		secondLastName?: string
	): Promise<RegisterResult> {
		const baseCommand: Omit<RegisterCommand, "secondLastName"> = {
			email,
			password,
			firstName,
			lastName,
		};
		const command: RegisterCommand = secondLastName
			? { ...baseCommand, secondLastName }
			: baseCommand;
		return this.registerHandler.execute(command);
	}

	async confirmEmail(token: string): Promise<boolean> {
		const command: ConfirmEmailCommand = { token };
		return this.confirmEmailHandler.execute(command);
	}
}
