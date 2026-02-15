/**
 * OfficeId value object - represents an office identifier
 */
export type OfficeId = string & { readonly __brand: "OfficeId" };

export function createOfficeId(value: string): OfficeId {
	if (!value || value.trim().length === 0) {
		throw new Error("OfficeId cannot be empty");
	}
	return value as OfficeId;
}

export function officeIdToString(id: OfficeId): string {
	return id;
}
