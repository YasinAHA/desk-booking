/**
 * ReservationId value object - represents a reservation identifier
 */
export type ReservationId = string & { readonly __brand: "ReservationId" };

export function createReservationId(value: string): ReservationId {
	if (!value || value.trim().length === 0) {
		throw new Error("ReservationId cannot be empty");
	}
	return value as ReservationId;
}

export function reservationIdToString(id: ReservationId): string {
	return id;
}
