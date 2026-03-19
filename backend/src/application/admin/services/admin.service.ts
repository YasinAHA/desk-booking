import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";
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
};

export class AdminService {
	constructor(private readonly deps: AdminServiceDependencies) {}

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
		return this.deps.adminRepo.updateGlobalSettings(patch);
	}

	async listDesks(requestedByUserId: string, filters: AdminDesksFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listDesks(filters);
	}

	async updateDeskLayout(requestedByUserId: string, deskId: string, patch: AdminDeskLayoutPatch) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.updateDeskLayout(deskId, patch);
	}

	async updateDeskLayoutsBulk(requestedByUserId: string, items: AdminDeskLayoutBulkItem[]) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.updateDeskLayoutsBulk(items);
	}

	async restoreDeskLayouts(requestedByUserId: string, input: AdminDeskLayoutRestoreInput) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.restoreDeskLayouts(input);
	}

	async updateDeskStatus(requestedByUserId: string, deskId: string, patch: AdminDeskStatusPatch) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.updateDeskStatus(deskId, patch);
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
		return this.deps.adminRepo.updateFloorplanConfig(officeId, patch);
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
		return this.deps.adminRepo.createFloorplanOverlay(officeId, input);
	}

	async updateFloorplanOverlay(
		requestedByUserId: string,
		officeId: string,
		overlayId: string,
		patch: AdminFloorplanOverlayPatch
	) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.updateFloorplanOverlay(officeId, overlayId, patch);
	}

	async deleteFloorplanOverlay(requestedByUserId: string, officeId: string, overlayId: string) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.deleteFloorplanOverlay(officeId, overlayId);
	}

	async listDeskQrs(requestedByUserId: string, filters: AdminDeskQrsFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listDeskQrs(filters);
	}

	async regenerateDeskQrsBulk(requestedByUserId: string, officeId?: string) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.regenerateDeskQrsBulk(officeId);
	}

	async listUsers(requestedByUserId: string, filters: AdminUsersFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listUsers(filters);
	}

	async updateUser(requestedByUserId: string, userId: string, patch: AdminUserPatch) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.updateUser(userId, patch);
	}

	async listReservations(requestedByUserId: string, filters: AdminReservationFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.listReservations(filters);
	}

	async createReservation(requestedByUserId: string, input: CreateAdminReservationInput) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.createReservation(input);
	}

	async updateReservationStatus(
		requestedByUserId: string,
		reservationId: string,
		status: AdminReservationStatus
	) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.updateReservationStatus(reservationId, status);
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
