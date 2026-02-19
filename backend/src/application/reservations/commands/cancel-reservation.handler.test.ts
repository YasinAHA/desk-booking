import assert from "node:assert/strict";
import test from "node:test";

import { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
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
		checkInByQr: async () => "not_found",
		...overrides,
	};
}

function mockQueryRepo(
	overrides: Partial<ReservationQueryRepository> = {}
): ReservationQueryRepository {
	return {
		findActiveByIdForUser: async () => null,
		listForUser: async () => [],
		hasActiveReservationForUserOnDate: async () => false,
		hasActiveReservationForDeskOnDate: async () => false,
		...overrides,
	};
}

test("CancelReservationHandler.execute returns true when row updated", async () => {
	const commandRepo = mockCommandRepo({
		cancel: async () => true,
	});
	const queryRepo = mockQueryRepo({
		findActiveByIdForUser: async (id, userId) => {
			assert.equal(id, createReservationId("res-1"));
			assert.equal(userId, createUserId("user"));
			return { id: createReservationId("res-1"), reservationDate: "2099-01-01" };
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
		findActiveByIdForUser: async () => ({
			id: createReservationId("res-2"),
			reservationDate: "2099-01-01",
		}),
	});
	const handler = new CancelReservationHandler({ commandRepo, queryRepo });

	const ok = await handler.execute({ userId: "user", reservationId: "res-2" });
	assert.equal(ok, false);
});
