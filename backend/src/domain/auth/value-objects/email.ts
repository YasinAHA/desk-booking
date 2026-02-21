/**
 * Email value object - represents a valid email address
 */
export type Email = string & { readonly __brand: "Email" };

export function createEmail(value: string): Email {
	const trimmed = value.trim().toLowerCase();
	const at = trimmed.indexOf("@");
	if (at <= 0 || at !== trimmed.lastIndexOf("@")) {
		throw new Error("Invalid email format");
	}

	const localPart = trimmed.slice(0, at);
	const domainPart = trimmed.slice(at + 1);
	if (!localPart || !domainPart) {
		throw new Error("Invalid email format");
	}

	if (
		localPart.includes(" ") ||
		domainPart.includes(" ") ||
		domainPart.startsWith(".") ||
		domainPart.endsWith(".") ||
		!domainPart.includes(".")
	) {
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
