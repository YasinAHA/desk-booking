import assert from "node:assert/strict";
import test from "node:test";

import { CreateReservationHandler } from "@application/reservations/commands/create-reservation.handler.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import { ReservationDateInPastError } from "@domain/reservations/entities/reservation.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
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
		...overrides,
	};
}

test("CreateReservationHandler.execute throws on past date", async () => {
	const commandRepo = mockCommandRepo({
		create: async () => {
			throw new Error("Repo should not be called");
		},
	});
	const handler = new CreateReservationHandler({ commandRepo });

	await assert.rejects(
		() =>
			handler.execute({
				userId: "user",
				date: "2000-01-01",
				deskId: "desk",
			}),
		ReservationDateInPastError
	);
});

test("CreateReservationHandler.execute inserts and returns id", async () => {
	const commandRepo = mockCommandRepo({
		create: async (userId, date, deskId, source, officeId) => {
			assert.equal(userId, createUserId("user"));
			assert.equal(date, "2026-02-20");
			assert.equal(deskId, createDeskId("desk"));
			assert.equal(source, "user");
			assert.equal(officeId, null);
			return createReservationId("res-1");
		},
	});
	const handler = new CreateReservationHandler({ commandRepo });

	const id = await handler.execute({
		userId: "user",
		date: "2026-02-20",
		deskId: "desk",
	});
	assert.equal(id, "res-1");
});
