import type { UserAuthorizationRepository } from "@application/auth/ports/user-authorization-repository.js";
import { AdminAuthorizationError } from "@application/desks/errors/admin-authorization-error.js";
import type {
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

	async getNoShowReport(requestedByUserId: string, filters: AdminReportFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getNoShowReport(filters);
	}

	async getSummaryReport(requestedByUserId: string, filters: AdminReportFilters) {
		await this.ensureAdmin(requestedByUserId);
		return this.deps.adminRepo.getSummaryReport(filters);
	}
}
