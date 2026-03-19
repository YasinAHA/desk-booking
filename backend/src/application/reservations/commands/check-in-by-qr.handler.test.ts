import assert from "node:assert/strict";
import test from "node:test";

import type { AuditEventWriter } from "@application/common/ports/audit-event-writer.js";
import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import { CheckInByQrHandler } from "@application/reservations/commands/check-in-by-qr.handler.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { ReservationQueryRepository } from "@application/reservations/ports/reservation-query-repository.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import {
	Reservation,
	type ReservationStatus,
} from "@domain/reservations/entities/reservation.js";
import { createReservationDate } from "@domain/reservations/value-objects/reservation-date.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";

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
		hasActiveReservationForUserInRange: async () => false,
		hasActiveReservationForDeskInRange: async () => false,
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

function mockAuditWriter(overrides: Partial<AuditEventWriter> = {}): AuditEventWriter {
	return {
		append: async () => {},
		...overrides,
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
		auditWriter: mockAuditWriter(),
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
			}),
		}),
		noShowPolicyService: mockNoShowPolicyService(),
		auditWriter: mockAuditWriter(),
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
			};
		},
	});
	const handler = new CheckInByQrHandler({
		commandRepo,
		queryRepo,
		noShowPolicyService: mockNoShowPolicyService(),
		auditWriter: mockAuditWriter(),
	});

	const result = await handler.execute({
		userId: "11111111-1111-1111-1111-111111111111",
		date: today,
		qrPublicId: "qr-123",
	});

	assert.equal(result, "checked_in");
});

test("CheckInByQrHandler.execute writes reservation_checked_in audit event", async () => {
	const today = new Date().toISOString().slice(0, 10);
	const auditCalls: unknown[] = [];
	const handler = new CheckInByQrHandler({
		commandRepo: mockCommandRepo({
			checkInReservation: async () => "checked_in",
		}),
		queryRepo: mockQueryRepo({
			findQrCheckInCandidate: async () => ({
				reservation: buildReservation("reserved", today),
			}),
		}),
		noShowPolicyService: mockNoShowPolicyService(),
		auditWriter: mockAuditWriter({
			append: async event => {
				auditCalls.push(event);
			},
		}),
	});

	await handler.execute({
		userId: "11111111-1111-1111-1111-111111111111",
		date: today,
		qrPublicId: "qr-123",
	});

	assert.equal(auditCalls.length, 1);
	assert.deepEqual(auditCalls[0], {
		eventType: "reservation_checked_in",
		actorType: "user",
		actorUserId: "11111111-1111-1111-1111-111111111111",
		reservationId: "11111111-1111-1111-8111-111111111111",
		deskId: "11111111-1111-1111-8111-111111111113",
		officeId: "11111111-1111-1111-8111-111111111114",
		metadata: { method: "qr" },
	});
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
		auditWriter: mockAuditWriter(),
	});

	const result = await handler.execute({
		userId: "11111111-1111-1111-1111-111111111111",
		date: today,
		qrPublicId: "qr-123",
	});

	assert.equal(result, "not_found");
	assert.equal(receivedDateInNoShowPolicy, today);
	assert.deepEqual(callOrder, ["markNoShowExpiredForDate", "findQrCheckInCandidate"]);
});