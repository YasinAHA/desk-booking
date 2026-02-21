import assert from "node:assert/strict";
import test from "node:test";

import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";
import { PgReservationQueryRepository } from "@infrastructure/reservations/repositories/pg-reservation-query-repository.js";

test("PgReservationQueryRepository.findByIdForUser returns null when missing", async () => {
	const repo = new PgReservationQueryRepository({
		query: async () => ({ rows: [] }),
	});

	const result = await repo.findByIdForUser(
		createReservationId("res-1"),
		createUserId("user-1")
	);
	assert.equal(result, null);
});

test("PgReservationQueryRepository.listForUser maps rows", async () => {
	const repo = new PgReservationQueryRepository({
		query: async (_text, params) => {
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

test("PgReservationQueryRepository.hasActiveReservationForUserOnDate returns true when row exists", async () => {
	const repo = new PgReservationQueryRepository({
		query: async (_text, params) => {
			assert.deepEqual(params, ["user-1", "2026-02-20"]);
			return { rows: [{ 1: 1 }] };
		},
	});

	const result = await repo.hasActiveReservationForUserOnDate(
		createUserId("user-1"),
		"2026-02-20"
	);
	assert.equal(result, true);
});

test("PgReservationQueryRepository.hasActiveReservationForDeskOnDate returns false when no rows", async () => {
	const repo = new PgReservationQueryRepository({
		query: async (_text, params) => {
			assert.deepEqual(params, ["desk-1", "2026-02-20"]);
			return { rows: [] };
		},
	});

	const result = await repo.hasActiveReservationForDeskOnDate(
		createDeskId("desk-1"),
		"2026-02-20"
	);
	assert.equal(result, false);
});

test("PgReservationQueryRepository.getDeskBookingPolicyContext returns context when desk exists", async () => {
	const repo = new PgReservationQueryRepository({
		query: async (_text, params) => {
			assert.deepEqual(params, ["desk-1"]);
			return {
				rows: [{ timezone: "Europe/Madrid", checkin_allowed_from: "06:00:00" }],
			};
		},
	});

	const result = await repo.getDeskBookingPolicyContext(createDeskId("desk-1"));
	assert.deepEqual(result, {
		timezone: "Europe/Madrid",
		checkinAllowedFrom: "06:00:00",
	});
});

test("PgReservationQueryRepository.findQrCheckInCandidate maps candidate row", async () => {
	const repo = new PgReservationQueryRepository({
		query: async (_text, params) => {
			assert.deepEqual(params, ["user-1", "2026-02-20", "qr-public-id"]);
			return {
				rows: [
					{
						id: "res-1",
						status: "reserved",
						reservation_date: "2026-02-20",
						timezone: "Europe/Madrid",
						checkin_allowed_from: "06:00:00",
						checkin_cutoff_time: "12:00:00",
					},
				],
			};
		},
	});

	const result = await repo.findQrCheckInCandidate(
		createUserId("user-1"),
		"2026-02-20",
		"qr-public-id"
	);

	assert.deepEqual(result, {
		id: createReservationId("res-1"),
		status: "reserved",
		reservationDate: "2026-02-20",
		timezone: "Europe/Madrid",
		checkinAllowedFrom: "06:00:00",
		checkinCutoffTime: "12:00:00",
	});
});
