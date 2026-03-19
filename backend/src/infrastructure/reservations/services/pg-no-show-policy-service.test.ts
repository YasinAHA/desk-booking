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
							desk_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f111",
							office_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f222",
							checkin_deadline_at: "2020-01-01T00:00:00.000Z",
						},
					],
				};
			}
			if (text.startsWith("update reservations")) {
				return {
					rows: [
						{
							id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f001",
							desk_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f111",
							office_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f222",
						},
					],
					rowCount: 1,
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
						desk_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f333",
						office_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f444",
						checkin_deadline_at: "2099-12-01T23:59:00.000Z",
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

test("PgNoShowPolicyService writes reservation_no_show audit events", async () => {
	const auditCalls: unknown[] = [];
	const db = {
		query: async (text: string) => {
			if (text.startsWith("select r.id")) {
				return {
					rows: [
						{
							id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f010",
							desk_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f011",
							office_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f012",
							checkin_deadline_at: "2020-01-01T00:00:00.000Z",
						},
					],
				};
			}
			return {
				rows: [
					{
						id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f010",
						desk_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f011",
						office_id: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f012",
					},
				],
				rowCount: 1,
			};
		},
	};
	const service = new PgNoShowPolicyService(db, {
		append: async event => {
			auditCalls.push(event);
		},
	});

	await service.markNoShowExpiredForDate("2026-02-21");

	assert.equal(auditCalls.length, 1);
	assert.deepEqual(auditCalls[0], {
		eventType: "reservation_no_show",
		actorType: "system",
		actorUserId: null,
		reservationId: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f010",
		deskId: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f011",
		officeId: "8ac1b2fa-95d1-4fcb-88d0-1ea2d7f7f012",
		reason: "checkin_deadline_expired",
	});
});
