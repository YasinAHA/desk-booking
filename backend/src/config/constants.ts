export const AUTH_EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export const AUTH_LOGIN_RATE_LIMIT = {
	max: 10,
	timeWindow: "1 minute",
} as const;

export const AUTH_VERIFY_RATE_LIMIT = {
	max: 20,
	timeWindow: "1 minute",
} as const;

export const AUTH_REGISTER_RATE_LIMIT = {
	max: 5,
	timeWindow: "10 minutes",
} as const;

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const TOKEN_BYTES = 32;
