/**
 * Password policy value object
 * Enforces strong password requirements: Security by Design
 *
 * Requirements:
 * - Minimum 12 characters (industry standard for sensitive systems)
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 digit (0-9)
 * - At least 1 special character (!@#$%^&*-_+=)
 *
 * Rationale:
 * - Length: 12+ chars significantly increases brute-force resistance
 * - Mixed case: prevents dictionary attacks
 * - Digit + special: ensures complexity
 * - No common patterns allowed (123, abc, qwerty)
 */

export class PasswordPolicyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PasswordPolicyError";
	}
}

export function validatePasswordPolicy(password: string): void {
	const minLength = 12;
	const errors: string[] = [];

	// Length validation
	if (password.length < minLength) {
		errors.push(`Password must be at least ${minLength} characters long`);
	}

	// Uppercase validation
	if (!/[A-Z]/.test(password)) {
		errors.push("Password must contain at least one uppercase letter (A-Z)");
	}

	// Lowercase validation
	if (!/[a-z]/.test(password)) {
		errors.push("Password must contain at least one lowercase letter (a-z)");
	}

	// Digit validation
	if (!/[0-9]/.test(password)) {
		errors.push("Password must contain at least one digit (0-9)");
	}

	// Special character validation
	if (!/[!@#$%^&*\-_+=]/.test(password)) {
		errors.push("Password must contain at least one special character: !@#$%^&*-_+=");
	}

	// Common patterns (basic check)
	const commonPatterns = /^(123|abc|qwerty|password|admin|letmein)/i;
	if (commonPatterns.test(password)) {
		errors.push("Password contains common patterns (e.g., 123, abc, qwerty)");
	}

	if (errors.length > 0) {
		throw new PasswordPolicyError(errors.join("; "));
	}
}

/**
 * Creates a validated password (branded type)
 * Throws PasswordPolicyError if policy is violated
 */
export type ValidatedPassword = string & { readonly __brand: "ValidatedPassword" };

export function createValidatedPassword(plainPassword: string): ValidatedPassword {
	validatePasswordPolicy(plainPassword);
	return plainPassword as ValidatedPassword;
}
