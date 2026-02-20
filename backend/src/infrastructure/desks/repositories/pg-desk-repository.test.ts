import assert from "node:assert/strict";
import test from "node:test";

import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";
import { PgDeskRepository } from "@infrastructure/desks/repositories/pg-desk-repository.js";

test("PgDeskRepository.listForDate maps rows", async () => {
	const repo = new PgDeskRepository({
		query: async (text, params) => {
			if (text.includes("set status = 'no_show'")) {
				assert.deepEqual(params, ["2026-02-20"]);
				return { rows: [], rowCount: 0 };
			}
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

test("PgDeskRepository.listForAdmin maps rows with qr_public_id", async () => {
	const repo = new PgDeskRepository({
		query: async text => {
			assert.ok(text.includes("select d.id, d.office_id, d.code, d.name, d.status, d.qr_public_id"));
			return {
				rows: [
					{
						id: "desk-1",
						office_id: "office-1",
						code: "D01",
						name: "Puesto 01",
						status: "active",
						qr_public_id: "qr-abc",
					},
				],
			};
		},
	});

	const result = await repo.listForAdmin();
	assert.equal(result.length, 1);
	const first = result[0];
	assert.ok(first);
	assert.equal(first.qrPublicId, "qr-abc");
});

test("PgDeskRepository.regenerateQrPublicId returns new qr id", async () => {
	const repo = new PgDeskRepository({
		query: async (text, params) => {
			assert.ok(text.includes("update desks set qr_public_id"));
			assert.deepEqual(params, ["desk-1"]);
			return {
				rows: [{ qr_public_id: "qr-new" }],
				rowCount: 1,
			};
		},
	});

	const qr = await repo.regenerateQrPublicId(createDeskId("desk-1"));
	assert.equal(qr, "qr-new");
});

test("PgDeskRepository.regenerateAllQrPublicIds returns updated rows count", async () => {
	const repo = new PgDeskRepository({
		query: async text => {
			assert.ok(text.includes("update desks set qr_public_id = gen_random_uuid()::text"));
			return {
				rows: [],
				rowCount: 7,
			};
		},
	});

	const updated = await repo.regenerateAllQrPublicIds();
	assert.equal(updated, 7);
});

