import assert from "node:assert/strict";
import test from "node:test";

import {
	Reservation,
	ReservationNotCancellableError,
} from "@domain/reservations/entities/reservation.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import { createReservationDate } from "@domain/reservations/value-objects/reservation-date.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";

function buildReservation(status: "reserved" | "checked_in" | "cancelled" | "no_show") {
	return new Reservation({
		id: createReservationId("res-1"),
		userId: createUserId("user-1"),
		deskId: createDeskId("desk-1"),
		officeId: createOfficeId("office-1"),
		reservationDate: createReservationDate("2026-02-20"),
		status,
		source: "user",
		cancelledAt: status === "cancelled" ? "2026-02-19T10:00:00.000Z" : null,
	});
}

test("Reservation.isActive is true for reserved and checked_in", () => {
	assert.equal(buildReservation("reserved").isActive(), true);
	assert.equal(buildReservation("checked_in").isActive(), true);
	assert.equal(buildReservation("cancelled").isActive(), false);
});

test("Reservation.cancel transitions active reservation to cancelled", () => {
	const reservation = buildReservation("reserved");
	const cancelled = reservation.cancel("2026-02-19T12:00:00.000Z");

	assert.equal(cancelled.status, "cancelled");
	assert.equal(cancelled.cancelledAt, "2026-02-19T12:00:00.000Z");
});

test("Reservation.cancel rejects non-cancellable reservations", () => {
	const cancelledReservation = buildReservation("cancelled");

	assert.throws(
		() => cancelledReservation.cancel("2026-02-19T12:00:00.000Z"),
		ReservationNotCancellableError
	);
});
