/**
 * DeskId value object - represents a desk identifier
 */
export type DeskId = string & { readonly __brand: "DeskId" };

export function createDeskId(value: string): DeskId {
	if (!value || value.trim().length === 0) {
		throw new Error("DeskId cannot be empty");
	}
	return value as DeskId;
}

export function deskIdToString(id: DeskId): string {
	return id;
}
