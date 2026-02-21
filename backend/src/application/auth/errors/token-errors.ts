export class InvalidTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidTokenError";
	}
}

export class RevokedTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RevokedTokenError";
	}
}

