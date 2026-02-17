import assert from "node:assert/strict";
import test from "node:test";

import { createOfficeId } from "@domain/value-objects/office-id.js";
import { createUserId } from "@domain/value-objects/user-id.js";
import { PgDeskRepository } from "@infrastructure/desks/repositories/pg-desk-repository.js";

test("PgDeskRepository.listForDate maps rows", async () => {
	const repo = new PgDeskRepository({
		query: async (text, params) => {
			assert.ok(text.includes("from desks"));
			assert.deepEqual(params, ["2026-02-20", "user-1"]);
			return {
				rows: [
					{
						id: "desk-1",
						office_id: "office-1",
						code: "D01",
						name: "Puesto 01",
						status: "active",
						is_reserved: false,
						is_mine: false,
						reservation_id: null,
						occupant_name: null,
					},
				],
			};
		},
	});

	const result = await repo.listForDate("2026-02-20", createUserId("user-1"));
	assert.deepEqual(result, [
		{
			id: "desk-1",
			officeId: createOfficeId("office-1"),
			code: "D01",
			name: "Puesto 01",
			status: "active",
			isReserved: false,
			isMine: false,
			reservationId: null,
			occupantName: null,
		},
	]);
});


