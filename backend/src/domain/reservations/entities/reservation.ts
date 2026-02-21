import type { UserId } from "@domain/auth/value-objects/user-id.js";
import type { DeskId } from "@domain/desks/value-objects/desk-id.js";
import type { OfficeId } from "@domain/desks/value-objects/office-id.js";
import type { ReservationDate } from "@domain/reservations/value-objects/reservation-date.js";
import type { ReservationId } from "@domain/reservations/value-objects/reservation-id.js";

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

export class ReservationOnNonWorkingDayError extends Error {
	constructor() {
		super("Reservation date is not a working day");
		this.name = "ReservationOnNonWorkingDayError";
	}
}

export class ReservationSameDayBookingClosedError extends Error {
	constructor() {
		super("Same-day reservation window has closed");
		this.name = "ReservationSameDayBookingClosedError";
	}
}

export class ReservationCancellationWindowClosedError extends Error {
	constructor() {
		super("Reservation cancellation window has closed");
		this.name = "ReservationCancellationWindowClosedError";
	}
}

export class ReservationDateInvalidError extends Error {
	constructor() {
		super("Reservation date is invalid");
		this.name = "ReservationDateInvalidError";
	}
}

export class ReservationNotCancellableError extends Error {
	constructor(status: ReservationStatus) {
		super(`Reservation is not cancellable in status: ${status}`);
		this.name = "ReservationNotCancellableError";
	}
}

type ReservationProps = {
	id: ReservationId;
	userId: UserId;
	deskId: DeskId;
	officeId: OfficeId;
	reservationDate: ReservationDate;
	status: ReservationStatus;
	source: ReservationSource;
	cancelledAt: string | null;
};

export class Reservation {
	readonly id: ReservationId;
	readonly userId: UserId;
	readonly deskId: DeskId;
	readonly officeId: OfficeId;
	readonly reservationDate: ReservationDate;
	readonly status: ReservationStatus;
	readonly source: ReservationSource;
	readonly cancelledAt: string | null;

	constructor(props: ReservationProps) {
		this.id = props.id;
		this.userId = props.userId;
		this.deskId = props.deskId;
		this.officeId = props.officeId;
		this.reservationDate = props.reservationDate;
		this.status = props.status;
		this.source = props.source;
		this.cancelledAt = props.cancelledAt;
	}

	isActive(): boolean {
		return this.status === "reserved" || this.status === "checked_in";
	}

	canBeCancelled(): boolean {
		return this.isActive() && this.cancelledAt === null;
	}

	cancel(cancelledAtIso: string): Reservation {
		if (!this.canBeCancelled()) {
			throw new ReservationNotCancellableError(this.status);
		}

		return new Reservation({
			id: this.id,
			userId: this.userId,
			deskId: this.deskId,
			officeId: this.officeId,
			reservationDate: this.reservationDate,
			status: "cancelled",
			source: this.source,
			cancelledAt: cancelledAtIso,
		});
	}
}

// Re-export from value object for convenience
export { isReservationDateInPast } from "@domain/reservations/value-objects/reservation-date.js";
