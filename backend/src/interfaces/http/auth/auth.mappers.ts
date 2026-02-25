import type { AuthUser } from "@application/auth/types.js";

function mapUser(user: AuthUser) {
	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		secondLastName: user.secondLastName,
	};
}

export function mapLoginResponse(args: {
	accessToken: string;
	refreshToken: string;
	user: AuthUser;
}) {
	return {
		accessToken: args.accessToken,
		refreshToken: args.refreshToken,
		user: mapUser(args.user),
	};
}

export function mapVerifyResponse(user: AuthUser) {
	return {
		valid: true,
		user: mapUser(user),
	};
}
