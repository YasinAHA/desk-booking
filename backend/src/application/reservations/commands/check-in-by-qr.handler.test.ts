import assert from "node:assert/strict";
import test from "node:test";

import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import { CheckInByQrHandler } from "@application/reservations/commands/check-in-by-qr.handler.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import {
	Reservation,
	type ReservationStatus,
} from "@domain/reservations/entities/reservation.js";
import { createReservationDate } from "@domain/reservations/value-objects/reservation-date.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

function mockCommandRepo(
	overrides: Partial<ReservationCommandRepository> = {}
): ReservationCommandRepository {
	return {
		create: async () => createReservationId("res-unused"),
		cancel: async () => false,
		checkInReservation: async () => "checked_in",
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
		getDeskBookingPolicyContext: async () => null,
		findQrCheckInCandidate: async () => null,
		...overrides,
	};
}

function mockNoShowPolicyService(): NoShowPolicyService {
	return {
		markNoShowExpiredForDate: async () => {},
	};
}

function buildReservation(status: ReservationStatus, reservationDate: string): Reservation {
	return new Reservation({
		id: createReservationId("11111111-1111-1111-8111-111111111111"),
		userId: createUserId("11111111-1111-1111-8111-111111111112"),
		deskId: createDeskId("11111111-1111-1111-8111-111111111113"),
		officeId: createOfficeId("11111111-1111-1111-8111-111111111114"),
		reservationDate: createReservationDate(reservationDate),
		status,
		source: "user",
		cancelledAt: null,
	});
}

test("CheckInByQrHandler.execute returns not_found when no candidate exists", async () => {
	const handler = new CheckInByQrHandler({
		commandRepo: mockCommandRepo(),
		queryRepo: mockQueryRepo({ findQrCheckInCandidate: async () => null }),
		noShowPolicyService: mockNoShowPolicyService(),
	});

	const result = await handler.execute({
		userId: "11111111-1111-1111-1111-111111111111",
		date: "2026-03-10",
		qrPublicId: "qr-123",
	});

	assert.equal(result, "not_found");
});

test("CheckInByQrHandler.execute returns already_checked_in when reservation was already checked in", async () => {
	const handler = new CheckInByQrHandler({
		commandRepo: mockCommandRepo(),
		queryRepo: mockQueryRepo({
			findQrCheckInCandidate: async () => ({
				reservation: buildReservation("checked_in", "2026-03-10"),
				timezone: "Europe/Madrid",
				checkinAllowedFrom: "08:00",
				checkinCutoffTime: "12:00",
			}),
		}),
		noShowPolicyService: mockNoShowPolicyService(),
	});

	const result = await handler.execute({
		userId: "11111111-1111-1111-1111-111111111111",
		date: "2026-03-10",
		qrPublicId: "qr-123",
	});

	assert.equal(result, "already_checked_in");
});

test("CheckInByQrHandler.execute returns checked_in when candidate is eligible", async () => {
	const today = new Date().toISOString().slice(0, 10);
	const commandRepo = mockCommandRepo({
		checkInReservation: async reservationId => {
			assert.equal(
				reservationId,
				createReservationId("11111111-1111-1111-8111-111111111111")
			);
			return "checked_in";
		},
	});
	const queryRepo = mockQueryRepo({
		findQrCheckInCandidate: async (_userId, _date, qrPublicId) => {
			assert.equal(qrPublicId, "qr-123");
			return {
				reservation: buildReservation("reserved", today),
				timezone: "Europe/Madrid",
				checkinAllowedFrom: "00:00",
				checkinCutoffTime: "23:59",
			};
		},
	});
	const handler = new CheckInByQrHandler({
		commandRepo,
		queryRepo,
		noShowPolicyService: mockNoShowPolicyService(),
	});

	const result = await handler.execute({
		userId: "11111111-1111-1111-1111-111111111111",
		date: today,
		qrPublicId: "qr-123",
	});

	assert.equal(result, "checked_in");
});

test("CheckInByQrHandler.execute runs no_show policy before candidate lookup", async () => {
	const callOrder: string[] = [];
	let receivedDateInNoShowPolicy: string | null = null;
	const today = new Date().toISOString().slice(0, 10);
	const handler = new CheckInByQrHandler({
		commandRepo: mockCommandRepo(),
		queryRepo: mockQueryRepo({
			findQrCheckInCandidate: async () => {
				callOrder.push("findQrCheckInCandidate");
				return null;
			},
		}),
		noShowPolicyService: {
			markNoShowExpiredForDate: async date => {
				callOrder.push("markNoShowExpiredForDate");
				receivedDateInNoShowPolicy = date;
			},
		},
	});

	const result = await handler.execute({
		userId: "11111111-1111-1111-1111-111111111111",
		date: today,
		qrPublicId: "qr-123",
	});

	assert.equal(result, "not_found");
	assert.equal(receivedDateInNoShowPolicy, today);
	assert.deepEqual(callOrder, [
		"markNoShowExpiredForDate",
		"findQrCheckInCandidate",
	]);
});

