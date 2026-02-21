import assert from "node:assert/strict";
import test from "node:test";

import { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
import {
	Reservation,
	ReservationCancellationWindowClosedError,
	ReservationNotCancellableError,
	type ReservationStatus,
} from "@domain/reservations/entities/reservation.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import { createReservationDate } from "@domain/reservations/value-objects/reservation-date.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

function mockCommandRepo(
	overrides: Partial<ReservationCommandRepository> = {}
): ReservationCommandRepository {
	return {
		create: async () => {
			throw new Error("create not mocked");
		},
		cancel: async () => false,
		checkInReservation: async () => "not_active",
		...overrides,
	};
}

function mockQueryRepo(
	overrides: Partial<ReservationQueryRepository> = {}
): ReservationQueryRepository {
	return {
		findByIdForUser: async () => null,
		listForUser: async () => [],
		hasActiveReservationForUserOnDate: async () => false,
		hasActiveReservationForDeskOnDate: async () => false,
		getDeskBookingPolicyContext: async () => null,
		findQrCheckInCandidate: async () => null,
		...overrides,
	};
}

function buildReservation(status: ReservationStatus): Reservation {
	return new Reservation({
		id: createReservationId("res-1"),
		userId: createUserId("user"),
		deskId: createDeskId("11111111-1111-1111-8111-111111111111"),
		officeId: createOfficeId("22222222-2222-2222-8222-222222222222"),
		reservationDate: createReservationDate("2099-01-01"),
		status,
		source: "user",
		cancelledAt: null,
	});
}

test("CancelReservationHandler.execute returns true when row updated", async () => {
	const commandRepo = mockCommandRepo({
		cancel: async () => true,
	});
	const queryRepo = mockQueryRepo({
		findByIdForUser: async (id, userId) => {
			assert.equal(id, createReservationId("res-1"));
			assert.equal(userId, createUserId("user"));
			return {
				reservation: buildReservation("reserved"),
				timezone: "UTC",
				checkinAllowedFrom: "23:59:59",
			};
		},
	});
	const handler = new CancelReservationHandler({ commandRepo, queryRepo });

	const ok = await handler.execute({ userId: "user", reservationId: "res-1" });
	assert.equal(ok, true);
});

test("CancelReservationHandler.execute returns false when nothing updated", async () => {
	const commandRepo = mockCommandRepo({
		cancel: async () => false,
	});
	const queryRepo = mockQueryRepo({
		findByIdForUser: async () => ({
			reservation: buildReservation("reserved"),
			timezone: "UTC",
			checkinAllowedFrom: "23:59:59",
		}),
	});
	const handler = new CancelReservationHandler({ commandRepo, queryRepo });

	const ok = await handler.execute({ userId: "user", reservationId: "res-2" });
	assert.equal(ok, false);
});

test("CancelReservationHandler.execute throws when reservation is checked-in", async () => {
	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo({
		findByIdForUser: async () => ({
			reservation: buildReservation("checked_in"),
			timezone: "UTC",
			checkinAllowedFrom: "23:59:59",
		}),
	});
	const handler = new CancelReservationHandler({ commandRepo, queryRepo });

	await assert.rejects(
		() => handler.execute({ userId: "user", reservationId: "res-3" }),
		ReservationNotCancellableError
	);
});

test("CancelReservationHandler.execute throws when cancellation window is closed", async () => {
	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo({
		findByIdForUser: async () => ({
			reservation: buildReservation("reserved"),
			timezone: "UTC",
			checkinAllowedFrom: "00:00:00",
		}),
	});
	const handler = new CancelReservationHandler({
		commandRepo,
		queryRepo,
		nowProvider: () => new Date("2099-01-01T12:00:00.000Z"),
	});

	await assert.rejects(
		() => handler.execute({ userId: "user", reservationId: "res-4" }),
		ReservationCancellationWindowClosedError
	);
});



