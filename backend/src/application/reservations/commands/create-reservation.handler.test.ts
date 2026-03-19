import assert from "node:assert/strict";
import test from "node:test";

import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
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
		checkInReservation: async () => "not_active",
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
		hasActiveReservationForUserInRange: async () => false,
		hasActiveReservationForDeskInRange: async () => false,
		getDeskBookingPolicyContext: async () => ({
			timezone: "UTC",
			checkinAllowedFrom: "06:00:00",
		}),
		findQrCheckInCandidate: async () => null,
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

function mockNoShowPolicyService(): NoShowPolicyService {
	return {
		markNoShowExpiredForDate: async () => {},
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
		noShowPolicyServiceFactory: () => mockNoShowPolicyService(),
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
		noShowPolicyServiceFactory: () => mockNoShowPolicyService(),
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
		noShowPolicyServiceFactory: () => mockNoShowPolicyService(),
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
		noShowPolicyServiceFactory: () => mockNoShowPolicyService(),
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
		noShowPolicyServiceFactory: () => mockNoShowPolicyService(),
	});

	const id = await handler.execute({
		userId: "user",
		date: futureDate,
		deskId: "desk",
	});
	assert.equal(id, "res-1");
});

test("CreateReservationHandler.execute inserts range reservation and returns id", async () => {
	const startsAt = "2099-02-23T09:00:00.000Z";
	const endsAt = "2099-02-23T13:00:00.000Z";
	const commandRepo = mockCommandRepo({
		create: async (_userId, _date, _deskId, source, officeId, argStartsAt, argEndsAt) => {
			assert.equal(source, "user");
			assert.equal(officeId, null);
			assert.equal(argStartsAt, startsAt);
			assert.equal(argEndsAt, endsAt);
			return createReservationId("res-2");
		},
	});
	const queryRepo = mockQueryRepo({
		hasActiveReservationForDeskInRange: async () => false,
		hasActiveReservationForUserInRange: async () => false,
	});
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
		noShowPolicyServiceFactory: () => mockNoShowPolicyService(),
	});

	const id = await handler.execute({
		userId: "user",
		startsAt,
		endsAt,
		deskId: "desk",
	});
	assert.equal(id, "res-2");
});

test("CreateReservationHandler.execute throws on weekend booking", async () => {
	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo();
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
		noShowPolicyServiceFactory: () => mockNoShowPolicyService(),
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
	const now = new Date();
	const sameDayDate = now.toISOString().slice(0, 10);
	const commandRepo = mockCommandRepo();
	const queryRepo = mockQueryRepo({
		getDeskBookingPolicyContext: async () => ({
			timezone: "UTC",
			checkinAllowedFrom: "00:00:00",
		}),
	});
	const handler = new CreateReservationHandler({
		txManager: mockTxManager(),
		commandRepoFactory: () => commandRepo,
		queryRepoFactory: () => queryRepo,
		noShowPolicyServiceFactory: () => mockNoShowPolicyService(),
		nowProvider: () => now,
	});

	await assert.rejects(
		() =>
			handler.execute({
				userId: "user",
				date: sameDayDate,
				deskId: "desk",
			}),
		err =>
			err instanceof ReservationSameDayBookingClosedError ||
			err instanceof ReservationOnNonWorkingDayError
	);
});



