import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";
import type { AuditEventWriter } from "@application/common/ports/audit-event-writer.js";
import { AdminAuthorizationError } from "@application/desks/errors/admin-authorization-error.js";
import type {
	AdminDeskLayoutPatch,
	AdminDeskLayoutBulkItem,
	AdminDeskLayoutRestoreInput,
	AdminDeskStatusPatch,
	AdminDesksFilters,
	AdminDeskQrsFilters,
	AdminFloorplanConfigPatch,
	AdminFloorplanOverlayCreate,
	AdminFloorplanOverlayPatch,
	AdminUserPatch,
	AdminUsersFilters,
	AdminAuditLogFilters,
	AdminReportFilters,
	AdminRepository,
	AdminReservationFilters,
	AdminReservationStatus,
	AdminSettingsPatch,
	CreateAdminReservationInput,
} from "@application/admin/ports/admin-repository.js";

type AdminServiceDependencies = {
	adminRepo: AdminRepository;
	userAuthorizationRepo: UserAuthorizationRepository;
	auditWriter: AuditEventWriter;
};

export class AdminService {
	constructor(private readonly deps: AdminServiceDependencies) {}

	private async appendAdminAction(
		requestedByUserId: string,
		action: string,
		targets: { reservationId?: string; deskId?: string; officeId?: string } = {},
		metadata: Record<string, unknown> = {}
	): Promise<void> {
		await this.deps.auditWriter.append({
			eventType: "admin_action",
			actorType: "admin",
			actorUserId: requestedByUserId,
			...(targets.reservationId ? { reservationId: targets.reservationId } : {}),
			...(targets.deskId ? { deskId: targets.deskId } : {}),
			...(targets.officeId ? { officeId: targets.officeId } : {}),
			metadata: { action, ...metadata },
		});
	}

	private async ensureAdmin(requestedByUserId: string): Promise<void> {
		const isAdmin = await this.deps.userAuthorizationRepo.isAdminUser(requestedByUserId);
		if (!isAdmin) {
			throw new AdminAuthorizationError();
		}
	}

	async getSettings(requestedByUserId: string) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getGlobalSettings();
	}

	async updateSettings(requestedByUserId: string, patch: AdminSettingsPatch) {
		await this.ensureAdmin(requestedByUserId);
		const updated = await this.deps.adminRepo.updateGlobalSettings(patch);
		await this.appendAdminAction(requestedByUserId, "update_settings");
		return updated;
	}

	async listDesks(requestedByUserId: string, filters: AdminDesksFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listDesks(filters);
	}

	async updateDeskLayout(requestedByUserId: string, deskId: string, patch: AdminDeskLayoutPatch) {
		await this.ensureAdmin(requestedByUserId);
		const updated = await this.deps.adminRepo.updateDeskLayout(deskId, patch);
		if (updated) {
			await this.appendAdminAction(
				requestedByUserId,
				"update_desk_layout",
				{ deskId, officeId: updated.officeId }
			);
		}
		return updated;
	}

	async updateDeskLayoutsBulk(requestedByUserId: string, items: AdminDeskLayoutBulkItem[]) {
		await this.ensureAdmin(requestedByUserId);
		const updated = await this.deps.adminRepo.updateDeskLayoutsBulk(items);
		if (updated.length > 0) {
			await this.appendAdminAction(requestedByUserId, "update_desk_layout_bulk", {}, {
				itemsCount: updated.length,
			});
		}
		return updated;
	}

	async restoreDeskLayouts(requestedByUserId: string, input: AdminDeskLayoutRestoreInput) {
		await this.ensureAdmin(requestedByUserId);
		const restored = await this.deps.adminRepo.restoreDeskLayouts(input);
		await this.appendAdminAction(
			requestedByUserId,
			"restore_desk_layouts",
			{ officeId: input.officeId },
			{
				...(input.zoneId ? { zoneId: input.zoneId } : {}),
				itemsCount: restored.length,
			}
		);
		return restored;
	}

	async updateDeskStatus(requestedByUserId: string, deskId: string, patch: AdminDeskStatusPatch) {
		await this.ensureAdmin(requestedByUserId);
		const updated = await this.deps.adminRepo.updateDeskStatus(deskId, patch);
		if (updated) {
			const actionMetadata: Record<string, unknown> = { status: patch.status };
			if (patch.statusReason !== undefined) {
				actionMetadata.statusReason = patch.statusReason;
			}
			await this.deps.auditWriter.append({
				eventType: "desk_status_changed",
				actorType: "admin",
				actorUserId: requestedByUserId,
				deskId: updated.id,
				officeId: updated.officeId,
				reason: patch.statusReason ?? null,
				metadata: {
					toStatus: patch.status,
				},
			});
			await this.appendAdminAction(
				requestedByUserId,
				"update_desk_status",
				{ deskId: updated.id, officeId: updated.officeId },
				actionMetadata
			);
		}
		return updated;
	}

	async getFloorplanConfig(requestedByUserId: string, officeId: string) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getFloorplanConfig(officeId);
	}

	async updateFloorplanConfig(
		requestedByUserId: string,
		officeId: string,
		patch: AdminFloorplanConfigPatch
	) {
		await this.ensureAdmin(requestedByUserId);
		const updated = await this.deps.adminRepo.updateFloorplanConfig(officeId, patch);
		if (updated) {
			await this.appendAdminAction(
				requestedByUserId,
				"update_floorplan_config",
				{ officeId }
			);
		}
		return updated;
	}

	async listFloorplanOverlays(requestedByUserId: string, officeId: string) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listFloorplanOverlays(officeId);
	}

	async createFloorplanOverlay(
		requestedByUserId: string,
		officeId: string,
		input: AdminFloorplanOverlayCreate
	) {
		await this.ensureAdmin(requestedByUserId);
		const created = await this.deps.adminRepo.createFloorplanOverlay(officeId, input);
		if (created) {
			await this.appendAdminAction(
				requestedByUserId,
				"create_floorplan_overlay",
				{ officeId },
				{ overlayId: created.id, kind: created.kind }
			);
		}
		return created;
	}

	async updateFloorplanOverlay(
		requestedByUserId: string,
		officeId: string,
		overlayId: string,
		patch: AdminFloorplanOverlayPatch
	) {
		await this.ensureAdmin(requestedByUserId);
		const updated = await this.deps.adminRepo.updateFloorplanOverlay(officeId, overlayId, patch);
		if (updated) {
			await this.appendAdminAction(
				requestedByUserId,
				"update_floorplan_overlay",
				{ officeId },
				{ overlayId }
			);
		}
		return updated;
	}

	async deleteFloorplanOverlay(requestedByUserId: string, officeId: string, overlayId: string) {
		await this.ensureAdmin(requestedByUserId);
		const deleted = await this.deps.adminRepo.deleteFloorplanOverlay(officeId, overlayId);
		if (deleted) {
			await this.appendAdminAction(
				requestedByUserId,
				"delete_floorplan_overlay",
				{ officeId },
				{ overlayId }
			);
		}
		return deleted;
	}

	async listDeskQrs(requestedByUserId: string, filters: AdminDeskQrsFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listDeskQrs(filters);
	}

	async regenerateDeskQrsBulk(requestedByUserId: string, officeId?: string) {
		await this.ensureAdmin(requestedByUserId);
		const regenerated = await this.deps.adminRepo.regenerateDeskQrsBulk(officeId);
		await this.appendAdminAction(
			requestedByUserId,
			"regenerate_desk_qr_bulk",
			officeId ? { officeId } : {},
			{ regenerated }
		);
		return regenerated;
	}

	async listUsers(requestedByUserId: string, filters: AdminUsersFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listUsers(filters);
	}

	async updateUser(requestedByUserId: string, userId: string, patch: AdminUserPatch) {
		await this.ensureAdmin(requestedByUserId);
		const updated = await this.deps.adminRepo.updateUser(userId, patch);
		if (updated) {
			await this.appendAdminAction(requestedByUserId, "update_user", {}, { userId });
		}
		return updated;
	}

	async listReservations(requestedByUserId: string, filters: AdminReservationFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listReservations(filters);
	}

	async createReservation(requestedByUserId: string, input: CreateAdminReservationInput) {
		await this.ensureAdmin(requestedByUserId);
		const reservationId = await this.deps.adminRepo.createReservation(input);
		await this.appendAdminAction(
			requestedByUserId,
			"create_admin_reservation",
			{
				reservationId,
				deskId: input.deskId,
				...(input.officeId ? { officeId: input.officeId } : {}),
			},
			{ reservationType: input.reservationType }
		);
		return reservationId;
	}

	async updateReservationStatus(
		requestedByUserId: string,
		reservationId: string,
		status: AdminReservationStatus
	) {
		await this.ensureAdmin(requestedByUserId);
		const updated = await this.deps.adminRepo.updateReservationStatus(reservationId, status);
		if (updated) {
			await this.appendAdminAction(
				requestedByUserId,
				"update_reservation_status",
				{ reservationId },
				{ status }
			);
		}
		return updated;
	}

	async getOccupancyReport(requestedByUserId: string, filters: AdminReportFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getOccupancyReport(filters);
	}

	async getCancellationsReport(requestedByUserId: string, filters: AdminReportFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getCancellationsReport(filters);
	}

	async getNoShowReport(requestedByUserId: string, filters: AdminReportFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getNoShowReport(filters);
	}

	async getAuditLogReport(requestedByUserId: string, filters: AdminAuditLogFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getAuditLogReport(filters);
	}

	async getSummaryReport(requestedByUserId: string, filters: AdminReportFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getSummaryReport(filters);
	}
}
