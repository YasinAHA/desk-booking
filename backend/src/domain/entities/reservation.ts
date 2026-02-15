import type { DeskId } from "../valueObjects/desk-id.js";
import type { OfficeId } from "../valueObjects/office-id.js";
import type { ReservationDate } from "../valueObjects/reservation-date.js";
import type { ReservationId } from "../valueObjects/reservation-id.js";
import type { UserId } from "../valueObjects/user-id.js";

/**
 * Domain entity for Reservation
 * Currently a type as queries return enriched ReservationRecord DTOs.
 *
 * FUTURE REFACTOR (v0.7.0+):
 * Will become a class when command repository returns full Reservation entities (not just IDs)
 * and domain logic like cancellation validations, no-show rules, and check-in windows are added.
 * See DATABASE-MODEL.md and SCOPE.md for v1.0.0+ features.
 */
export type Reservation = {
	id: ReservationId;
	userId: UserId;
	deskId: DeskId;
	officeId: OfficeId;
	reservationDate: ReservationDate;
	status: ReservationStatus;
	source: ReservationSource;
	cancelledAt: string | null;
};

export type ReservationStatus = "reserved" | "checked_in" | "cancelled" | "no_show";
export type ReservationSource = "user" | "admin" | "walk_in" | "system";

export class ReservationConflictError extends Error {
	constructor() {
		super("Reservation conflict");
		this.name = "ReservationConflictError";
	}
}

export class ReservationDateInPastError extends Error {
	constructor() {
		super("Reservation date is in the past");
		this.name = "ReservationDateInPastError";
	}
}

// Re-export from value object for convenience
export { isReservationDateInPast } from "../valueObjects/reservation-date.js";
