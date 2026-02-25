import assert from "node:assert/strict";
import test from "node:test";

import type { ErrorTranslator } from "@application/common/ports/error-translator.js";
import {
	DeskAlreadyReservedError,
	ReservationConflictError,
	UserAlreadyHasReservationError,
} from "@domain/reservations/entities/reservation.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";
import { PgReservationCommandRepository } from "@infrastructure/reservations/repositories/pg-reservation-command-repository.js";
import { PgErrorTranslator } from "@infrastructure/services/error-translator.js";

test("PgReservationCommandRepository.create throws desk conflict on desk/day unique violation", async () => {
	const errorTranslator: ErrorTranslator = new PgErrorTranslator();
	const repo = new PgReservationCommandRepository(
		{
			query: async () => {
				const err = new Error("duplicate key");
				(err as { code?: string; constraint?: string }).code = "23505";
				(err as { code?: string; constraint?: string }).constraint = "ux_res_active_desk_day";
				throw err;
			},
		},
		errorTranslator
	);

	await assert.rejects(
		() =>
			repo.create(
				createUserId("user-1"),
				"2026-02-20",
				createDeskId("desk-1"),
				"user",
				null
			),
		DeskAlreadyReservedError
	);
});

test("PgReservationCommandRepository.create throws user/day conflict on user/day unique violation", async () => {
	const errorTranslator: ErrorTranslator = new PgErrorTranslator();
	const repo = new PgReservationCommandRepository(
		{
			query: async () => {
				const err = new Error("duplicate key");
				(err as { code?: string; constraint?: string }).code = "23505";
				(err as { code?: string; constraint?: string }).constraint = "ux_res_active_user_day";
				throw err;
			},
		},
		errorTranslator
	);

	await assert.rejects(
		() =>
			repo.create(
				createUserId("user-1"),
				"2026-02-20",
				createDeskId("desk-1"),
				"user",
				null
			),
		UserAlreadyHasReservationError
	);
});

test("PgReservationCommandRepository.create throws generic conflict on unknown unique violation", async () => {
	const errorTranslator: ErrorTranslator = new PgErrorTranslator();
	const repo = new PgReservationCommandRepository(
		{
			query: async () => {
				const err = new Error("duplicate key");
				(err as { code?: string; constraint?: string }).code = "23505";
				throw err;
			},
		},
		errorTranslator
	);

	await assert.rejects(
		() =>
			repo.create(
				createUserId("user-1"),
				"2026-02-20",
				createDeskId("desk-1"),
				"user",
				null
			),
		ReservationConflictError
	);
});

test("PgReservationCommandRepository.checkInReservation returns checked_in when update affects a row", async () => {
	const repo = new PgReservationCommandRepository(
		{
			query: async text => {
				if (text.startsWith("update reservations")) {
					return { rows: [{ id: "res-1" }], rowCount: 1 };
				}
				return { rows: [], rowCount: 0 };
			},
		},
		new PgErrorTranslator()
	);

	const result = await repo.checkInReservation(createReservationId("res-1"));
	assert.equal(result, "checked_in");
});

test("PgReservationCommandRepository.checkInReservation returns already_checked_in when status is checked_in", async () => {
	const repo = new PgReservationCommandRepository(
		{
			query: async text => {
				if (text.startsWith("update reservations")) {
					return { rows: [], rowCount: 0 };
				}
				return { rows: [{ status: "checked_in" }], rowCount: 1 };
			},
		},
		new PgErrorTranslator()
	);

	const result = await repo.checkInReservation(createReservationId("res-1"));
	assert.equal(result, "already_checked_in");
});

test("PgReservationCommandRepository.checkInReservation returns not_active for non-reserved status", async () => {
	const repo = new PgReservationCommandRepository(
		{
			query: async text => {
				if (text.startsWith("update reservations")) {
					return { rows: [], rowCount: 0 };
				}
				return { rows: [{ status: "cancelled" }], rowCount: 1 };
			},
		},
		new PgErrorTranslator()
	);

	const result = await repo.checkInReservation(createReservationId("res-1"));
	assert.equal(result, "not_active");
});
