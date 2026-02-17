import assert from "node:assert/strict";
import test from "node:test";

import type { ReservationCommandRepository } from "@application/ports/reservation-command-repository.js";
import type { ReservationQueryRepository, ReservationRecord } from "@application/ports/reservation-query-repository.js";
import { ReservationDateInPastError } from "@domain/entities/reservation.js";
import { createDeskId } from "@domain/value-objects/desk-id.js";
import { createOfficeId } from "@domain/value-objects/office-id.js";
import { createReservationId } from "@domain/value-objects/reservation-id.js";
import { createUserId } from "@domain/value-objects/user-id.js";
import { ReservationUseCase } from "./reservation.usecase.js";

function mockCommandRepo(
	overrides: Partial<ReservationCommandRepository> = {}
): ReservationCommandRepository {
	return {
		create: async () => {
			throw new Error("create not mocked");
		},
		cancel: async () => false,
		...overrides,
	};
}

function mockQueryRepo(
	overrides: Partial<ReservationQueryRepository> = {}
): ReservationQueryRepository {
	return {
		findActiveByIdForUser: async () => null,
		listForUser: async () => [],
		...overrides,
	};
}

test("ReservationUseCase.create throws on past date", async () => {
	const commandRepo = mockCommandRepo({
		create: async () => {
			throw new Error("Repo should not be called");
		},
	});
	const queryRepo = mockQueryRepo();
	const useCase = new ReservationUseCase(commandRepo, queryRepo);
	await assert.rejects(
		() => useCase.create("user", "2000-01-01", "desk"),
		ReservationDateInPastError
	);
});

test("ReservationUseCase.create inserts and returns id", async () => {
	const commandRepo = mockCommandRepo({
		create: async (userId, date, deskId, source, officeId) => {
			assert.equal(userId, createUserId("user"));
			assert.equal(date, "2026-02-20");
			assert.equal(deskId, createDeskId("desk"));
			assert.equal(source, "user");
			assert.equal(officeId, null);
			return createReservationId("res-1");
		},
	});
	const queryRepo = mockQueryRepo();
	const useCase = new ReservationUseCase(commandRepo, queryRepo);

	const id = await useCase.create("user", "2026-02-20", "desk");
	assert.equal(id, "res-1");
});

test("ReservationUseCase.cancel returns true when row updated", async () => {
	const commandRepo = mockCommandRepo({
		cancel: async () => true,
	});
	const queryRepo = mockQueryRepo({
		findActiveByIdForUser: async (id, userId) => {
			assert.equal(id, createReservationId("res-1"));
			assert.equal(userId, createUserId("user"));
			return { id: createReservationId("res-1"), reservationDate: "2099-01-01" };
		},
	});
	const useCase = new ReservationUseCase(commandRepo, queryRepo);

	const ok = await useCase.cancel("user", "res-1");
	assert.equal(ok, true);
});

test("ReservationUseCase.cancel returns false when nothing updated", async () => {
	const commandRepo = mockCommandRepo({
		cancel: async () => false,
	});
	const queryRepo = mockQueryRepo({
		findActiveByIdForUser: async () => ({
			id: createReservationId("res-2"),
			reservationDate: "2099-01-01",
		}),
	});
	const useCase = new ReservationUseCase(commandRepo, queryRepo);

	const ok = await useCase.cancel("user", "res-2");
	assert.equal(ok, false);
});

test("ReservationUseCase.listForUser returns rows", async () => {
	const rows: ReservationRecord[] = [
		{
			id: createReservationId("res-1"),
			deskId: createDeskId("desk-1"),
			officeId: createOfficeId("office-1"),
			deskName: "Puesto 01",
			reservationDate: "2026-02-20",
			source: "user",
			cancelledAt: null,
		},
	];

	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo({
		listForUser: async (userId) => {
			assert.equal(userId, createUserId("user"));
			return rows;
		},
	});
	const useCase = new ReservationUseCase(commandRepo, queryRepo);

	const result = await useCase.listForUser("user");
	assert.deepEqual(result, rows);
});

