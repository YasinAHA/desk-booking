import assert from "node:assert/strict";
import test from "node:test";

import { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";
import type {
	ReservationQueryRepository,
	ReservationRecord,
} from "@application/reservations/ports/reservation-query-repository.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

function mockQueryRepo(
	overrides: Partial<ReservationQueryRepository> = {}
): ReservationQueryRepository {
	return {
		findActiveByIdForUser: async () => null,
		listForUser: async () => [],
		...overrides,
	};
}

test("ListUserReservationsHandler.execute returns rows", async () => {
	const rows: ReservationRecord[] = [
		{
			id: createReservationId("res-1"),
			deskId: createDeskId("desk-1"),
			officeId: createOfficeId("office-1"),
			deskName: "Puesto 01",
			reservationDate: "2026-02-20",
			source: "user",
			cancelledAt: null,
		},
	];

	const queryRepo = mockQueryRepo({
		listForUser: async userId => {
			assert.equal(userId, createUserId("user"));
			return rows;
		},
	});
	const handler = new ListUserReservationsHandler({ queryRepo });

	const result = await handler.execute({ userId: "user" });
	assert.deepEqual(result, rows);
});
