import assert from "node:assert/strict";
import test from "node:test";

import { PgAuditEventWriter } from "@infrastructure/audit/pg-audit-event-writer.js";

test("PgAuditEventWriter.append stores normalized payload", async () => {
	const calls: Array<{ text: string; params?: unknown[] }> = [];
	const writer = new PgAuditEventWriter({
		query: async (text: string, params?: unknown[]) => {
			if (typeof params === "undefined") {
				calls.push({ text });
			} else {
				calls.push({ text, params });
			}
			return { rows: [], rowCount: 1 };
		},
	});

	await writer.append({
		eventType: "reservation_created",
		actorType: "user",
		actorUserId: "11111111-1111-1111-8111-111111111111",
		reservationId: "22222222-2222-2222-8222-222222222222",
		deskId: "33333333-3333-3333-8333-333333333333",
		officeId: "44444444-4444-4444-8444-444444444444",
		reason: "integration-test",
		metadata: { source: "user", mode: "range" },
	});

	assert.equal(calls.length, 1);
	assert.match(calls[0]?.text ?? "", /insert into audit_events/);
	assert.deepEqual(calls[0]?.params, [
		"reservation_created",
		"user",
		"11111111-1111-1111-8111-111111111111",
		"22222222-2222-2222-8222-222222222222",
		"33333333-3333-3333-8333-333333333333",
		"44444444-4444-4444-8444-444444444444",
		"integration-test",
		JSON.stringify({ source: "user", mode: "range" }),
	]);
});
