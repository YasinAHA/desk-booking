import assert from "node:assert/strict";
import test from "node:test";

import { createTransactionalContext, type TransactionManager } from "@application/common/ports/transaction-manager.js";
import { CreateReservationHandler } from "@application/reservations/commands/create-reservation.handler.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
import {
	DeskAlreadyReservedError,
	ReservationDateInvalidError,
	ReservationDateInPastError,
	ReservationOnNonWorkingDayError,
	ReservationSameDayBookingClosedError,
	UserAlreadyHasReservationError,
} from "@domain/reservations/entities/reservation.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

function buildFutureDate(daysAhead = 7): string {
	const d = new Date();
	d.setDate(d.getDate() + daysAhead);
	while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
		d.setDate(d.getDate() + 1);
	}
	return d.toISOString().slice(0, 10);
}

function mockCommandRepo(
	overrides: Partial<ReservationCommandRepository> = {}
): ReservationCommandRepository {
	return {
		create: async () => {
			throw new Error("create not mocked");
		},
		cancel: async () => false,
		checkInByQr: async () => "not_found",
		...overrides,
	};
}

function mockQueryRepo(
	overrides: Partial<ReservationQueryRepository> = {}
): ReservationQueryRepository {
	return {
		findByIdForUser: async () => null,
		listForUser: async () => [],
		hasActiveReservationForUserOnDate: async () => false,
		hasActiveReservationForDeskOnDate: async () => false,
		isSameDayBookingClosedForDesk: async () => false,
		...overrides,
	};
}

function mockTxManager(): TransactionManager {
	return {
		runInTransaction: async callback => {
			const tx = createTransactionalContext({
				query: async () => ({ rows: [], rowCount: 0 }),
			});
			return callback(tx);
		},
	};
}

test("CreateReservationHandler.execute throws on past date", async () => {
	const commandRepo = mockCommandRepo({
		create: async () => {
			throw new Error("Repo should not be called");
		},
	});
	const queryRepo = mockQueryRepo();
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
	});

	await assert.rejects(
		() =>
			handler.execute({
				userId: "user",
				date: "2000-01-01",
				deskId: "desk",
			}),
		ReservationDateInPastError
	);
});

test("CreateReservationHandler.execute throws on invalid calendar date", async () => {
	const commandRepo = mockCommandRepo({
		create: async () => {
			throw new Error("Repo should not be called");
		},
	});
	const queryRepo = mockQueryRepo();
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
	});

	await assert.rejects(
		() =>
			handler.execute({
				userId: "user",
				date: "2026-02-31",
				deskId: "desk",
			}),
		ReservationDateInvalidError
	);
});

test("CreateReservationHandler.execute throws desk conflict before user/day conflict", async () => {
	const futureDate = buildFutureDate();
	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo({
		hasActiveReservationForDeskOnDate: async () => true,
		hasActiveReservationForUserOnDate: async () => true,
	});
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
	});

	await assert.rejects(
		() =>
			handler.execute({
				userId: "user",
				date: futureDate,
				deskId: "desk",
			}),
		DeskAlreadyReservedError
	);
});

test("CreateReservationHandler.execute throws user/day conflict when desk is free", async () => {
	const futureDate = buildFutureDate();
	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo({
		hasActiveReservationForDeskOnDate: async () => false,
		hasActiveReservationForUserOnDate: async () => true,
	});
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
	});

	await assert.rejects(
		() =>
			handler.execute({
				userId: "user",
				date: futureDate,
				deskId: "desk",
			}),
		UserAlreadyHasReservationError
	);
});

test("CreateReservationHandler.execute inserts and returns id", async () => {
	const futureDate = buildFutureDate();
	const commandRepo = mockCommandRepo({
		create: async (userId, date, deskId, source, officeId) => {
			assert.equal(userId, createUserId("user"));
			assert.equal(date, futureDate);
			assert.equal(deskId, createDeskId("desk"));
			assert.equal(source, "user");
			assert.equal(officeId, null);
			return createReservationId("res-1");
		},
	});
	const queryRepo = mockQueryRepo({
		hasActiveReservationForDeskOnDate: async () => false,
		hasActiveReservationForUserOnDate: async () => false,
	});
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
	});

	const id = await handler.execute({
		userId: "user",
		date: futureDate,
		deskId: "desk",
	});
	assert.equal(id, "res-1");
});

test("CreateReservationHandler.execute throws on weekend booking", async () => {
	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo();
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
	});

	await assert.rejects(
		() =>
			handler.execute({
				userId: "user",
				date: "2099-02-21",
				deskId: "desk",
			}),
		ReservationOnNonWorkingDayError
	);
});

test("CreateReservationHandler.execute throws when same-day cutoff has passed", async () => {
	const futureDate = buildFutureDate();
	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo({
		isSameDayBookingClosedForDesk: async () => true,
	});
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
	});

	await assert.rejects(
		() =>
			handler.execute({
				userId: "user",
				date: futureDate,
				deskId: "desk",
			}),
		ReservationSameDayBookingClosedError
	);
});
