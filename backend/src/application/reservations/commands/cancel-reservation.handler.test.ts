import assert from "node:assert/strict";
import test from "node:test";

import { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
import {
	ReservationCancellationWindowClosedError,
	ReservationNotCancellableError,
} from "@domain/reservations/entities/reservation.js";
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
		isSameDayBookingClosedForDesk: async () => false,
		findQrCheckInCandidate: async () => null,
		...overrides,
	};
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
				id: createReservationId("res-1"),
				reservationDate: "2099-01-01",
				status: "reserved",
				isSameDayBookingClosed: false,
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
			id: createReservationId("res-2"),
			reservationDate: "2099-01-01",
			status: "reserved",
			isSameDayBookingClosed: false,
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
			id: createReservationId("res-3"),
			reservationDate: "2099-01-01",
			status: "checked_in",
			isSameDayBookingClosed: false,
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
			id: createReservationId("res-4"),
			reservationDate: "2099-01-01",
			status: "reserved",
			isSameDayBookingClosed: true,
		}),
	});
	const handler = new CancelReservationHandler({ commandRepo, queryRepo });

	await assert.rejects(
		() => handler.execute({ userId: "user", reservationId: "res-4" }),
		ReservationCancellationWindowClosedError
	);
});



