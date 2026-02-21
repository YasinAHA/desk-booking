export class InvalidEmailError extends Error {
	constructor() {
		super("Invalid email format");
		this.name = "InvalidEmailError";
	}
}

export class EmptyUserIdError extends Error {
	constructor() {
		super("UserId cannot be empty");
		this.name = "EmptyUserIdError";
	}
}

export class EmptyPasswordHashError extends Error {
	constructor() {
		super("PasswordHash cannot be empty");
		this.name = "EmptyPasswordHashError";
	}
}

export class EmailAlreadyConfirmedError extends Error {
	constructor() {
		super("Email is already confirmed");
		this.name = "EmailAlreadyConfirmedError";
	}
}
