import assert from "node:assert/strict";
import test from "node:test";

import { createDeskId } from "@domain/value-objects/desk-id.js";
import { createOfficeId } from "@domain/value-objects/office-id.js";
import { createReservationId } from "@domain/value-objects/reservation-id.js";
import { createUserId } from "@domain/value-objects/user-id.js";
import { PgReservationQueryRepository } from "@infrastructure/reservations/repositories/pg-reservation-query-repository.js";

test("PgReservationQueryRepository.findActiveByIdForUser returns null when missing", async () => {
	const repo = new PgReservationQueryRepository({
		query: async () => ({ rows: [] }),
	});

	const result = await repo.findActiveByIdForUser(createReservationId("res-1"), createUserId("user-1"));
	assert.equal(result, null);
});

test("PgReservationQueryRepository.listForUser maps rows", async () => {
	const repo = new PgReservationQueryRepository({
		query: async (text, params) => {
			assert.ok(text.includes("from reservations"));
			assert.deepEqual(params, ["user-1"]);
			return {
				rows: [
					{
						id: "res-1",
						desk_id: "desk-1",
						office_id: "office-1",
						desk_name: "Puesto 01",
						reservation_date: "2026-02-20",
						source: "user",
						cancelled_at: null,
					},
				],
			};
		},
	});

	const result = await repo.listForUser(createUserId("user-1"));
	assert.deepEqual(result, [
		{
			id: createReservationId("res-1"),
			deskId: createDeskId("desk-1"),
			officeId: createOfficeId("office-1"),
			deskName: "Puesto 01",
			reservationDate: "2026-02-20",
			source: "user",
			cancelledAt: null,
		},
	]);
});


