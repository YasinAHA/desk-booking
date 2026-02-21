export class AdminAuthorizationError extends Error {
	constructor(message = "Admin access required") {
		super(message);
		this.name = "AdminAuthorizationError";
	}
}
