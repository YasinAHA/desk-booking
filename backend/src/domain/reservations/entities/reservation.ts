import type { DeskId } from "@domain/desks/value-objects/desk-id.js";
import type { OfficeId } from "@domain/desks/value-objects/office-id.js";
import type { ReservationDate } from "@domain/reservations/value-objects/reservation-date.js";
import type { ReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";

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

export class DeskAlreadyReservedError extends ReservationConflictError {
	constructor() {
		super();
		this.name = "DeskAlreadyReservedError";
	}
}

export class UserAlreadyHasReservationError extends ReservationConflictError {
	constructor() {
		super();
		this.name = "UserAlreadyHasReservationError";
	}
}

export class ReservationDateInPastError extends Error {
	constructor() {
		super("Reservation date is in the past");
		this.name = "ReservationDateInPastError";
	}
}

export class ReservationDateInvalidError extends Error {
	constructor() {
		super("Reservation date is invalid");
		this.name = "ReservationDateInvalidError";
	}
}

// Re-export from value object for convenience
export { isReservationDateInPast } from "@domain/reservations/value-objects/reservation-date.js";
