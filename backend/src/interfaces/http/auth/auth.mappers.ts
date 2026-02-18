import type { AuthUser } from "@application/auth/types.js";

function mapUser(user: AuthUser) {
	return {
		id: user.id,
		email: user.email,
		first_name: user.firstName,
		last_name: user.lastName,
		second_last_name: user.secondLastName,
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
