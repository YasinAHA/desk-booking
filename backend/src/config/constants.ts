export const AUTH_EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const AUTH_PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export const AUTH_LOGIN_RATE_LIMIT = {
	max: 10,
	timeWindow: "1 minute",
} as const;

export const AUTH_VERIFY_RATE_LIMIT = {
	max: 20,
	timeWindow: "1 minute",
} as const;

export const AUTH_REFRESH_RATE_LIMIT = {
	max: 20,
	timeWindow: "1 minute",
} as const;

export const AUTH_REGISTER_RATE_LIMIT = {
	max: 5,
	timeWindow: "10 minutes",
} as const;

export const AUTH_FORGOT_PASSWORD_RATE_LIMIT = {
	max: 5,
	timeWindow: "10 minutes",
} as const;

export const AUTH_RESET_PASSWORD_RATE_LIMIT = {
	max: 10,
	timeWindow: "10 minutes",
} as const;

export const AUTH_CHANGE_PASSWORD_RATE_LIMIT = {
	max: 10,
	timeWindow: "10 minutes",
} as const;

export const AUTH_FORGOT_PASSWORD_IDENTIFIER_RATE_LIMIT = {
	max: 3,
	timeWindowMs: 10 * 60 * 1000,
} as const;

export const AUTH_RESET_PASSWORD_IDENTIFIER_RATE_LIMIT = {
	max: 5,
	timeWindowMs: 10 * 60 * 1000,
} as const;

export const AUTH_FORGOT_PASSWORD_MIN_RESPONSE_MS = 300;

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const TOKEN_BYTES = 32;
