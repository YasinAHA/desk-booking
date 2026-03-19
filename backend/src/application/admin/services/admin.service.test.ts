import assert from "node:assert/strict";
import test from "node:test";

import type { AdminRepository } from "@application/admin/ports/admin-repository.js";
import { AdminService } from "@application/admin/services/admin.service.js";
import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";
import type { AuditEventWriter } from "@application/common/ports/audit-event-writer.js";
import { AdminAuthorizationError } from "@application/desks/errors/admin-authorization-error.js";

function buildAdminRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
	return {
		getGlobalSettings: async () => ({
			id: "settings-1",
			allowSelfRegistration: false,
			guestModeEnabled: true,
			checkinWindowMinutes: 15,
			maxAdvanceDays: 7,
			maxReservationsPerUser: 1,
			cancellationDeadlineMinutes: 120,
			defaultReservationDurationMinutes: 480,
			businessHoursStart: "08:00",
			businessHoursEnd: "20:00",
			allowedEmailDomains: [],
		}),
		updateGlobalSettings: async () => ({
			id: "settings-1",
			allowSelfRegistration: false,
			guestModeEnabled: true,
			checkinWindowMinutes: 15,
			maxAdvanceDays: 7,
			maxReservationsPerUser: 1,
			cancellationDeadlineMinutes: 120,
			defaultReservationDurationMinutes: 480,
			businessHoursStart: "08:00",
			businessHoursEnd: "20:00",
			allowedEmailDomains: [],
		}),
		listDesks: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
		updateDeskLayout: async () => null,
		updateDeskLayoutsBulk: async () => [],
		restoreDeskLayouts: async () => [],
		updateDeskStatus: async () => null,
		getFloorplanConfig: async () => null,
		updateFloorplanConfig: async () => null,
		listFloorplanOverlays: async () => [],
		createFloorplanOverlay: async () => null,
		updateFloorplanOverlay: async () => null,
		deleteFloorplanOverlay: async () => false,
		listDeskQrs: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
		regenerateDeskQrsBulk: async () => 0,
		listUsers: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
		updateUser: async () => null,
		listReservations: async () => [],
		createReservation: async () => "res-1",
		updateReservationStatus: async () => false,
		getOccupancyReport: async () => ({ start: "2026-01-01", end: "2026-01-31", items: [] }),
		getCancellationsReport: async () => ({ start: "2026-01-01", end: "2026-01-31", items: [] }),
		getNoShowReport: async () => ({ start: "2026-01-01", end: "2026-01-31", items: [] }),
		getAuditLogReport: async () => ({ start: "2026-01-01", end: "2026-01-31", items: [] }),
		getSummaryReport: async () => ({
			start: "2026-01-01",
			end: "2026-01-31",
			totalReservations: 0,
			checkedIn: 0,
			cancelled: 0,
			noShow: 0,
		}),
		...overrides,
	};
}

function buildUserAuthorizationRepo(
	isAdmin: boolean
): UserAuthorizationRepository {
	return {
		isAdminUser: async () => isAdmin,
	};
}

function buildAuditWriter(calls: unknown[]): AuditEventWriter {
	return {
		append: async event => {
			calls.push(event);
		},
	};
}

test("AdminService.updateDeskStatus writes desk_status_changed and admin_action", async () => {
	const auditCalls: unknown[] = [];
	const adminService = new AdminService({
		adminRepo: buildAdminRepo({
			updateDeskStatus: async () => ({
				id: "desk-1",
				officeId: "office-1",
				zoneId: null,
				zoneName: null,
				code: "P01",
				name: "Desk P01",
				status: "maintenance",
				statusReason: "broken",
				qrPublicId: "qr-1",
				layoutX: null,
				layoutY: null,
				layoutW: null,
				layoutH: null,
				rotationDeg: 0,
				displayOrder: 1,
				archivedAt: null,
			}),
		}),
		userAuthorizationRepo: buildUserAuthorizationRepo(true),
		auditWriter: buildAuditWriter(auditCalls),
	});

	await adminService.updateDeskStatus("admin-1", "desk-1", {
		status: "maintenance",
		statusReason: "broken",
	});

	assert.equal(auditCalls.length, 2);
	assert.deepEqual(auditCalls[0], {
		eventType: "desk_status_changed",
		actorType: "admin",
		actorUserId: "admin-1",
		deskId: "desk-1",
		officeId: "office-1",
		reason: "broken",
		metadata: { toStatus: "maintenance" },
	});
	assert.deepEqual(auditCalls[1], {
		eventType: "admin_action",
		actorType: "admin",
		actorUserId: "admin-1",
		deskId: "desk-1",
		officeId: "office-1",
		metadata: {
			action: "update_desk_status",
			status: "maintenance",
			statusReason: "broken",
		},
	});
});

test("AdminService.createReservation writes admin_action", async () => {
	const auditCalls: unknown[] = [];
	const adminService = new AdminService({
		adminRepo: buildAdminRepo({
			createReservation: async () => "reservation-1",
		}),
		userAuthorizationRepo: buildUserAuthorizationRepo(true),
		auditWriter: buildAuditWriter(auditCalls),
	});

	const reservationId = await adminService.createReservation("admin-1", {
		reservationType: "guest",
		deskId: "desk-1",
		officeId: "office-1",
		startsAt: "2026-04-01T09:00:00.000Z",
		endsAt: "2026-04-01T12:00:00.000Z",
		guestName: "Guest",
		guestEmail: "guest@example.com",
		guestCompany: "Example",
	});

	assert.equal(reservationId, "reservation-1");
	assert.equal(auditCalls.length, 1);
	assert.deepEqual(auditCalls[0], {
		eventType: "admin_action",
		actorType: "admin",
		actorUserId: "admin-1",
		reservationId: "reservation-1",
		deskId: "desk-1",
		officeId: "office-1",
		metadata: {
			action: "create_admin_reservation",
			reservationType: "guest",
		},
	});
});

test("AdminService mutation rejects non-admin users before writing audit", async () => {
	const auditCalls: unknown[] = [];
	const adminService = new AdminService({
		adminRepo: buildAdminRepo(),
		userAuthorizationRepo: buildUserAuthorizationRepo(false),
		auditWriter: buildAuditWriter(auditCalls),
	});

	await assert.rejects(
		() => adminService.updateSettings("user-1", { allowSelfRegistration: true }),
		AdminAuthorizationError
	);
	assert.equal(auditCalls.length, 0);
});
