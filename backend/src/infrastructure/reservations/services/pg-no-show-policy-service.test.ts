import assert from "node:assert/strict";
import test from "node:test";

import { PgNoShowPolicyService } from "@infrastructure/reservations/services/pg-no-show-policy-service.js";

test("PgNoShowPolicyService marks eligible rows as no_show", async () => {
	const calls: Array<{ text: string; params: unknown[] | undefined }> = [];
	const db = {
		query: async (text: string, params?: unknown[]) => {
			calls.push({ text, params });
			if (text.startsWith("select r.id")) {
				return {
					rows: [
						{
							id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f001",
							status: "reserved",
							reservation_date: "2026-02-21",
							timezone: "UTC",
							checkin_cutoff_time: "00:00:00",
						},
					],
				};
			}
			return { rows: [], rowCount: 1 };
		},
	};
	const service = new PgNoShowPolicyService(db);

	await service.markNoShowExpiredForDate("2026-02-21");

	assert.equal(calls.length, 2);
	assert.match(calls[1]?.text ?? "", /update reservations set status = 'no_show'/);
	assert.deepEqual(calls[1]?.params, [[
		"8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f001",
	]]);
});

test("PgNoShowPolicyService skips update when no row is eligible", async () => {
	const calls: Array<{ text: string; params: unknown[] | undefined }> = [];
	const db = {
		query: async (text: string, params?: unknown[]) => {
			calls.push({ text, params });
			return {
				rows: [
					{
						id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f002",
						status: "reserved",
						reservation_date: "2099-12-01",
						timezone: "UTC",
						checkin_cutoff_time: "23:59:00",
					},
				],
			};
		},
	};
	const service = new PgNoShowPolicyService(db);

	await service.markNoShowExpiredForDate("2099-12-01");

	assert.equal(calls.length, 1);
	assert.match(calls[0]?.text ?? "", /select r.id/);
});
