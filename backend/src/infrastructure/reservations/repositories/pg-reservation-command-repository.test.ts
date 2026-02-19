import assert from "node:assert/strict";
import test from "node:test";

import type { ErrorTranslator } from "@application/common/ports/error-translator.js";
import {
	DeskAlreadyReservedError,
	ReservationConflictError,
	UserAlreadyHasReservationError,
} from "@domain/reservations/entities/reservation.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
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

test("PgReservationCommandRepository.checkInByQr returns semantic status", async () => {
	const repo = new PgReservationCommandRepository(
		{
			query: async () => ({ rows: [{ result: "already_checked_in" }] }),
		},
		new PgErrorTranslator()
	);

	const result = await repo.checkInByQr(
		createUserId("user-1"),
		"2026-02-20",
		"qr-public-id"
	);

	assert.equal(result, "already_checked_in");
});
