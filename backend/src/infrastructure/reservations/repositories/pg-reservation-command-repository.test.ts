import assert from "node:assert/strict";
import test from "node:test";

import type { ErrorTranslator } from "@application/ports/error-translator.js";
import { ReservationConflictError } from "@domain/reservations/entities/reservation.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";
import { PgReservationCommandRepository } from "@infrastructure/reservations/repositories/pg-reservation-command-repository.js";
import { PgErrorTranslator } from "@infrastructure/services/error-translator.js";

test("PgReservationCommandRepository.create throws conflict on unique violation", async () => {
	const errorTranslator: ErrorTranslator = new PgErrorTranslator();
	const repo = new PgReservationCommandRepository(
		{
			query: async () => {
				const err = new Error("duplicate key");
				(err as { code?: string }).code = "23505";
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




