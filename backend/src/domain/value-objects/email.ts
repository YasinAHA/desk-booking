/**
 * Email value object - represents a valid email address
 */
export type Email = string & { readonly __brand: "Email" };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createEmail(value: string): Email {
	const trimmed = value.trim().toLowerCase();
	if (!EMAIL_REGEX.test(trimmed)) {
		throw new Error("Invalid email format");
	}
	return trimmed as Email;
}

export function emailToString(email: Email): string {
	return email;
}

export function getEmailDomain(email: Email): string {
	return email.split("@")[1] || "";
}
